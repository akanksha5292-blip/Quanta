import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { runBadgeCheck } from "@/lib/badge-check";
import { getRedis } from "@/lib/redis";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { formatIstDate, addIstCalendarDays } from "@/lib/ist";
import { ensureUserFromClerk } from "@/lib/users";
import { isRedisConfigured } from "@/lib/config";
import {
  scoreGuesstimate,
  scoreGk,
  scoreJudgment,
  scoreWarmup,
  scoreWordplay,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";

type RoundType = "guesstimate" | "warmup" | "gk" | "wordplay" | "judgment";

type RoundScores = {
  guesstimate?: number;
  warmup?: number;
  gk?: number[];
  wordplay?: number;
  judgment?: number;
  _gkElapsedMs?: number;
};

function sumScores(rs: RoundScores): number {
  let t = 0;
  if (rs.guesstimate) t += rs.guesstimate;
  if (rs.warmup) t += rs.warmup;
  if (rs.gk?.length) t += rs.gk.reduce((a, b) => a + b, 0);
  if (rs.wordplay) t += rs.wordplay;
  if (rs.judgment) t += rs.judgment;
  return t;
}

function mergeRoundScore(
  prev: RoundScores,
  roundType: RoundType,
  score: number,
  timingMs: number,
): RoundScores {
  const next: RoundScores = { ...prev };
  if (roundType === "gk") {
    const arr = [...(prev.gk ?? [])];
    arr.push(score);
    next.gk = arr.slice(-3);
    const elapsed = Math.max(0, 30000 - Math.min(30000, timingMs));
    next._gkElapsedMs = (prev._gkElapsedMs ?? 0) + elapsed;
  } else {
    next[roundType] = score;
  }
  return next;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    questionId?: string;
    answer?: string | number;
    timingMs?: number;
    roundType?: RoundType;
  };

  const { questionId, answer, timingMs = 0, roundType } = body;
  if (!questionId || answer === undefined || !roundType) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const idemKey = `submitted:${userId}:${questionId}`;
  if (isRedisConfigured()) {
    const cached = await getRedis().get<string>(idemKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

  const supabase = createServiceRoleClient();
  const { data: q, error: qErr } = await supabase.from("questions").select("*").eq("id", questionId).single();
  if (qErr || !q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correctStr = String(q.correct_answer);
  const userStr = String(answer);
  const userNum = Number(userStr);
  const correctNum = Number(correctStr);

  let correct = false;
  let score = 0;

  switch (roundType) {
    case "guesstimate": {
      if (!Number.isFinite(userNum) || !Number.isFinite(correctNum)) {
        return NextResponse.json({ error: "Invalid numeric answer" }, { status: 400 });
      }
      score = scoreGuesstimate(userNum, correctNum);
      correct = score === 100;
      break;
    }
    case "warmup": {
      correct = userStr.trim().toLowerCase() === correctStr.trim().toLowerCase();
      score = scoreWarmup(correct);
      break;
    }
    case "gk": {
      correct = userStr.trim().toLowerCase() === correctStr.trim().toLowerCase();
      score = scoreGk(correct, timingMs);
      break;
    }
    case "wordplay": {
      correct = userStr.trim().toLowerCase() === correctStr.trim().toLowerCase();
      score = scoreWordplay(correct, timingMs);
      break;
    }
    case "judgment": {
      score = scoreJudgment(userStr, correctStr);
      correct = score === 100;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown round" }, { status: 400 });
  }

  const result = {
    correct,
    correctAnswer: q.correct_answer,
    score,
    funFact: q.fun_fact ?? null,
  };

  if (isRedisConfigured()) {
    await getRedis().set(idemKey, JSON.stringify(result), { ex: 60 * 60 * 48 });
  }

  const istDate = formatIstDate();
  const clerkUser = await currentUser();
  const internalId = await ensureUserFromClerk(userId, {
    email: clerkUser?.emailAddresses[0]?.emailAddress,
    firstName: clerkUser?.firstName,
    imageUrl: clerkUser?.imageUrl,
  });
  if (!internalId) {
    return NextResponse.json({ error: "User not provisioned" }, { status: 400 });
  }

  const { data: dailySet } = await supabase.from("daily_sets").select("id").eq("date", istDate).maybeSingle();

  const { data: existingSession } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", internalId)
    .eq("date", istDate)
    .maybeSingle();

  const prevScores = (existingSession?.round_scores as RoundScores | null) ?? {};
  const nextScores = mergeRoundScore(prevScores, roundType, score, timingMs);
  const totalScore = sumScores(nextScores);

  const isJudgment = roundType === "judgment";

  await supabase.from("game_sessions").upsert(
    {
      user_id: internalId,
      daily_set_id: dailySet?.id ?? null,
      date: istDate,
      status: isJudgment ? "completed" : "in_progress",
      total_score: totalScore,
      round_scores: nextScores as unknown as Record<string, never>,
      time_taken_seconds: isJudgment
        ? Math.max(0, Math.round((existingSession?.time_taken_seconds ?? 0) + timingMs / 1000))
        : Math.round((existingSession?.time_taken_seconds ?? 0) + timingMs / 1000),
      completed_at: isJudgment ? new Date().toISOString() : existingSession?.completed_at ?? null,
    },
    { onConflict: "user_id,date" },
  );

  if (isJudgment) {
    const { data: lb } = await supabase
      .from("leaderboard_daily")
      .select("id")
      .eq("user_id", internalId)
      .eq("date", istDate)
      .maybeSingle();

    const { count: rankCount } = await supabase
      .from("leaderboard_daily")
      .select("*", { count: "exact", head: true })
      .eq("date", istDate);

    const { count: better } = await supabase
      .from("leaderboard_daily")
      .select("*", { count: "exact", head: true })
      .eq("date", istDate)
      .gt("score", totalScore);

    const rankGlobal = (better ?? 0) + 1;
    const percentile =
      rankCount && rankCount > 0 ? Math.round(((rankCount - rankGlobal) / rankCount) * 1000) / 10 : null;

    if (!lb) {
      await supabase.from("leaderboard_daily").insert({
        user_id: internalId,
        date: istDate,
        score: totalScore,
        rank_global: rankGlobal,
        rank_percentile: percentile,
      });
    } else {
      await supabase
        .from("leaderboard_daily")
        .update({ score: totalScore, rank_global: rankGlobal, rank_percentile: percentile })
        .eq("id", lb.id);
    }

    const { data: u } = await supabase
      .from("users")
      .select("streak_current,streak_longest,streak_last_played,total_games_played")
      .eq("id", internalId)
      .single();

    const lastPlayed = u?.streak_last_played as string | null | undefined;
    let streak = u?.streak_current ?? 0;
    if (!lastPlayed) {
      streak = 1;
    } else if (lastPlayed === istDate) {
      streak = u?.streak_current ?? streak;
    } else {
      const yesterday = addIstCalendarDays(-1);
      streak = lastPlayed === yesterday ? (u?.streak_current ?? 0) + 1 : 1;
    }
    const longest = Math.max(streak, u?.streak_longest ?? 0);

    await supabase
      .from("users")
      .update({
        streak_current: streak,
        streak_longest: longest,
        streak_last_played: istDate,
        total_games_played: (u?.total_games_played ?? 0) + 1,
      })
      .eq("id", internalId);

    const newBadges = await runBadgeCheck(internalId, istDate);
    return NextResponse.json({ ...result, newBadges });
  }

  return NextResponse.json(result);
}
