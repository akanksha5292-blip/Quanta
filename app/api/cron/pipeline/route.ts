import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { createDraftQuestions, type DraftQuestionInput } from "@/lib/notion";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FALLBACK_NEWS = [
  "India ISRO space achievements",
  "RBI monetary policy India economy",
  "Global AI adoption statistics 2024",
  "India renewable energy solar milestones",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWikiEvents(): Promise<string[]> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`;
  try {
    const res = await fetch(url, {
      headers: { "Api-User-Agent": "QUANTA-Game/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: { year?: number; text?: string }[] };
    const events = (data.events ?? []).slice(0, 4);
    return events.map((e) => `${e.year ?? "?"}: ${e.text ?? ""}`);
  } catch {
    return [];
  }
}

async function fetchNewsTopics(): Promise<string[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return FALLBACK_NEWS;
  const url = `https://gnews.io/api/v4/top-headlines?lang=en&country=in&max=4&apikey=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return FALLBACK_NEWS;
    const data = (await res.json()) as { articles?: { title?: string }[] };
    const titles = (data.articles ?? [])
      .map((a) => a.title)
      .filter((t): t is string => Boolean(t));
    return titles.length ? titles : FALLBACK_NEWS;
  } catch {
    return FALLBACK_NEWS;
  }
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1] ?? trimmed;
  return JSON.parse(body);
}

async function callClaude(wikiLines: string[], newsTopics: string[]): Promise<DraftQuestionInput[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const prompt = `You are QUANTA's editorial engine. Using the context below, create EXACTLY 7 draft trivia questions as JSON.

Context — Wikipedia "on this day" (top events):
${wikiLines.join("\n")}

Context — news / topics:
${newsTopics.join("\n")}

Return ONLY a JSON array (no prose) of 7 objects in this order:
1) guesstimate
2) warmup
3) gk
4) gk
5) gk
6) wordplay
7) judgment

Each object MUST match:
{
  "type": "guesstimate"|"warmup"|"gk"|"wordplay"|"judgment",
  "category": one of Food|Space|History|Nature|Politics|Science|People|Animals|Geography|Tech,
  "difficulty": "Easy"|"Medium"|"Hard",
  "name": string (the main question text OR fact text for warmup phase 1),
  "options": string[] (MCQ options; for guesstimate/judgment use 4 strings; warmup needs 4 options; wordplay 4 distractors not used as tiles but keep 4 strings placeholder),
  "correctAnswer": string (exact option text OR numeric string for guesstimate correct value OR expert option text for judgment),
  "guesstimatUnit": string|null,
  "guesstimatMin": number|null,
  "guesstimatMax": number|null,
  "funFact": string|null,
  "source": string|null (http/https URL if available else null),
  "bizarreScore": number (1-10)
}

Rules:
- GK set: mix difficulties (one Easy, one Medium, one Hard) when possible.
- Warmup: "name" is the fun fact paragraph; include a tricky MCQ in options about that fact; correctAnswer matches one option string.
- Wordplay: "name" is the clue; correctAnswer is the unscrambled word; options can be empty array or hints.
- Judgment: three plausible stances in options; correctAnswer is the expert-endorsed stance text.
- Guesstimate: provide plausible min/max and unit; correctAnswer numeric string within range.
`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text");

  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed) || parsed.length !== 7) {
    throw new Error("Claude JSON not a 7-item array");
  }

  return parsed as DraftQuestionInput[];
}

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const today = new Date().toISOString().slice(0, 10);
  const wikiLines = await fetchWikiEvents();
  const newsTopics = await fetchNewsTopics();

  let status: "ok" | "error" = "ok";
  let lastError: string | null = null;

  try {
    const drafts = await callClaude(wikiLines, newsTopics);

    let notionOk = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await createDraftQuestions(drafts);
        notionOk = true;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt < 3) await sleep(2000);
      }
    }
    if (!notionOk) {
      throw new Error(lastError ?? "Notion failed");
    }
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
    // Claude / Notion failures should alert operator
    if (lastError) {
      console.error("[pipeline]", lastError);
    }
    try {
      const supabase = createServiceRoleClient();
      await supabase.from("pipeline_logs").insert({
        log_date: today,
        status,
        wiki_events_count: wikiLines.length,
        news_count: newsTopics.length,
      });
    } catch {
      /* ignore logging failure */
    }
    return NextResponse.json({ error: lastError }, { status: 500 });
  }

  try {
    const supabase = createServiceRoleClient();
    await supabase.from("pipeline_logs").insert({
      log_date: today,
      status,
      wiki_events_count: wikiLines.length,
      news_count: newsTopics.length,
    });
  } catch (e) {
    console.error("[pipeline] log insert failed", e);
  }

  return NextResponse.json({
    ok: true,
    wiki_events_count: wikiLines.length,
    news_count: newsTopics.length,
  });
}
