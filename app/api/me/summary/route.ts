import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { formatIstDate, addIstCalendarDays } from "@/lib/ist";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = formatIstDate();
  const supabase = createServiceRoleClient();
  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).maybeSingle();
  if (!user?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  const { data: lb } = await supabase
    .from("leaderboard_daily")
    .select("score, rank_percentile, rank_global")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  const start = addIstCalendarDays(-89);
  const { data: history } = await supabase
    .from("game_sessions")
    .select("date, status")
    .eq("user_id", user.id)
    .gte("date", start)
    .order("date", { ascending: true });

  const playedDates = new Set(
    (history ?? []).filter((h) => h.status === "completed").map((h) => h.date),
  );

  const topPercent =
    lb?.rank_percentile != null ? Math.max(1, Math.round(100 - lb.rank_percentile)) : null;

  return NextResponse.json({
    today,
    session,
    leaderboard: lb,
    topPercent,
    playedDates: [...playedDates],
  });
}
