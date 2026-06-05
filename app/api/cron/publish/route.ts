import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { fetchPublishedQuestions, getNotion, type NotionQuestionRow } from "@/lib/notion";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getRedis } from "@/lib/redis";
import { addIstCalendarDays, formatIstDate } from "@/lib/ist";
import { isRedisConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

async function pickFallbackRow(
  type: NotionQuestionRow["type"],
  difficulty: NotionQuestionRow["difficulty"] | null,
  supabase: ReturnType<typeof createServiceRoleClient>,
) {
  const cutoff = addIstCalendarDays(-180);
  let q = supabase
    .from("questions")
    .select("*")
    .eq("type", type)
    .not("used_on", "is", null)
    .lt("used_on", cutoff)
    .order("used_on", { ascending: true })
    .limit(1);
  if (difficulty) q = q.eq("difficulty", difficulty);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

function rowToNotionShape(fb: Record<string, unknown>): NotionQuestionRow {
  return {
    notionPageId: String(fb.notion_id),
    name: String(fb.question),
    type: fb.type as NotionQuestionRow["type"],
    category: String(fb.category) as NotionQuestionRow["category"],
    difficulty: String(fb.difficulty) as NotionQuestionRow["difficulty"],
    options: (fb.options as string[]) ?? [],
    correctAnswer: String(fb.correct_answer),
    guesstimatUnit: (fb.guesstimate_unit as string | null) ?? null,
    guesstimatMin: (fb.guesstimate_dist_min as number | null) ?? null,
    guesstimatMax: (fb.guesstimate_dist_max as number | null) ?? null,
    funFact: (fb.fun_fact as string | null) ?? null,
    source: (fb.source as string | null) ?? null,
    bizarreScore: (fb.bizarre_score as number | null) ?? null,
    status: "Published",
  };
}

function mapRowToSupabaseInsert(row: NotionQuestionRow) {
  return {
    notion_id: row.notionPageId,
    type: row.type,
    category: row.category,
    difficulty: row.difficulty,
    question: row.name,
    options: row.options,
    correct_answer: row.correctAnswer,
    guesstimate_unit: row.guesstimatUnit,
    guesstimate_dist_min: row.guesstimatMin,
    guesstimate_dist_max: row.guesstimatMax,
    fun_fact: row.funFact,
    source: row.source,
    bizarre_score: row.bizarreScore,
  };
}

async function upsertQuestionsFromNotion(rows: NotionQuestionRow[]) {
  const supabase = createServiceRoleClient();
  const payload = rows.map(mapRowToSupabaseInsert);
  const { data, error } = await supabase.from("questions").upsert(payload, { onConflict: "notion_id" }).select();
  if (error) throw error;
  return data ?? [];
}

async function selectSeven(published: NotionQuestionRow[]) {
  const supabase = createServiceRoleClient();
  const used = new Set<string>();

  function pickFromPublished(
    type: NotionQuestionRow["type"],
    difficulty?: NotionQuestionRow["difficulty"],
  ): NotionQuestionRow | null {
    const candidates = shuffle(published.filter((p) => p.type === type && !used.has(p.notionPageId)));
    const pick = difficulty ? candidates.find((c) => c.difficulty === difficulty) : candidates[0];
    if (!pick) return null;
    used.add(pick.notionPageId);
    return pick;
  }

  async function pickOrFallback(
    type: NotionQuestionRow["type"],
    difficulty?: NotionQuestionRow["difficulty"],
  ): Promise<NotionQuestionRow | null> {
    const direct = pickFromPublished(type, difficulty);
    if (direct) return direct;
    const fb = await pickFallbackRow(type, difficulty ?? null, supabase);
    if (!fb) return null;
    const id = String(fb.notion_id);
    if (used.has(id)) return null;
    used.add(id);
    return rowToNotionShape(fb);
  }

  const guesstimate = await pickOrFallback("guesstimate");
  const warmup = await pickOrFallback("warmup");

  const gks: NotionQuestionRow[] = [];
  for (const diff of ["Easy", "Medium", "Hard"] as const) {
    const g = await pickOrFallback("gk", diff);
    if (g && !gks.some((x) => x.notionPageId === g.notionPageId)) gks.push(g);
  }
  while (gks.length < 3) {
    const g = await pickOrFallback("gk");
    if (!g || gks.some((x) => x.notionPageId === g.notionPageId)) break;
    gks.push(g);
  }

  const wordplay = await pickOrFallback("wordplay");
  const judgment = await pickOrFallback("judgment");

  const ordered = [guesstimate, warmup, ...gks, wordplay, judgment].filter(Boolean) as NotionQuestionRow[];
  if (ordered.length < 7) {
    throw new Error("Not enough questions to compose daily set");
  }
  return ordered.slice(0, 7);
}

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate =
    dateParam === "today"
      ? formatIstDate()
      : dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : addIstCalendarDays(1);

  const published = await fetchPublishedQuestions();
  const selected = await selectSeven(published);
  const upserted = await upsertQuestionsFromNotion(selected);

  const byNotion = new Map(upserted.map((q) => [q.notion_id as string, q]));

  const findId = (type: NotionQuestionRow["type"]) =>
    byNotion.get(selected.find((s) => s.type === type)!.notionPageId)!.id as string;

  const guesstimateId = findId("guesstimate");
  const warmupId = findId("warmup");
  const gkIds = selected
    .filter((s) => s.type === "gk")
    .map((s) => byNotion.get(s.notionPageId)!.id as string);
  const wordplayId = findId("wordplay");
  const judgmentId = findId("judgment");

  const supabase = createServiceRoleClient();
  const { error: dsError } = await supabase.from("daily_sets").upsert(
    {
    date: targetDate,
    guesstimate_id: guesstimateId,
    warmup_id: warmupId,
    gk_ids: gkIds,
    wordplay_id: wordplayId,
    judgment_id: judgmentId,
    published_at: new Date().toISOString(),
    },
    { onConflict: "date" },
  );

  if (dsError) {
    return NextResponse.json({ error: dsError.message }, { status: 500 });
  }

  const ids = upserted.map((q) => q.id as string);
  await supabase.from("questions").update({ used_on: targetDate }).in("id", ids);

  for (const row of selected) {
    try {
      await getNotion().pages.update({
        page_id: row.notionPageId,
        properties: {
          Status: { select: { name: "Scheduled" } },
        },
      });
    } catch (e) {
      console.error("[publish] notion update failed", row.notionPageId, e);
    }
  }

  if (isRedisConfigured()) {
    const compiled = { date: targetDate, questions: upserted };
    await getRedis().set(`daily_set:${targetDate}`, JSON.stringify(compiled), { ex: 60 * 60 * 48 });
  }

  const publishedCount = published.length;
  if (publishedCount < 14 && process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `QUANTA buffer low: only ${publishedCount} Published questions in Notion (need >= 14).`,
      }),
    });
  }

  return NextResponse.json({ ok: true, date: targetDate, questionIds: ids });
}
