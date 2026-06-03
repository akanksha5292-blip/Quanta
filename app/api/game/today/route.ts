import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUserFromClerk } from "@/lib/users";
import { getRedis } from "@/lib/redis";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getGameTodayRatelimit } from "@/lib/ratelimit";
import { isRedisConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

function stripAnswers<T extends { correct_answer?: string }>(rows: T[]) {
  return rows.map(({ correct_answer: _removed, ...rest }) => rest);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRedisConfigured()) {
    const rl = getGameTodayRatelimit();
    const { success } = await rl.limit(userId);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }

  const user = await currentUser();
  await ensureUserFromClerk(userId, {
    email: user?.emailAddresses[0]?.emailAddress,
    firstName: user?.firstName,
    imageUrl: user?.imageUrl,
  });

  const istDate = new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);

  if (isRedisConfigured()) {
    const redis = getRedis();
    const cached = await redis.get<string>(`daily_set:${istDate}`);
    if (cached) {
      const parsed = JSON.parse(cached) as { date: string; questions: Record<string, unknown>[] };
      return NextResponse.json({
        date: parsed.date,
        questions: stripAnswers(parsed.questions as { correct_answer?: string }[]),
      });
    }
  }

  const supabase = createServiceRoleClient();
  const { data: set, error } = await supabase
    .from("daily_sets")
    .select("*")
    .eq("date", istDate)
    .maybeSingle();

  if (error || !set) {
    return NextResponse.json({ message: "Game not published yet, check back soon" }, { status: 404 });
  }

  const ids = [
    set.guesstimate_id,
    set.warmup_id,
    ...(set.gk_ids as string[]),
    set.wordplay_id,
    set.judgment_id,
  ].filter(Boolean) as string[];

  const { data: questions, error: qErr } = await supabase.from("questions").select("*").in("id", ids);
  if (qErr || !questions?.length) {
    return NextResponse.json({ message: "Game not published yet, check back soon" }, { status: 404 });
  }

  const payload = { date: istDate, questions };
  if (isRedisConfigured()) {
    await getRedis().set(`daily_set:${istDate}`, JSON.stringify(payload), { ex: 60 * 60 * 48 });
  }

  return NextResponse.json({
    date: istDate,
    questions: stripAnswers(questions),
  });
}
