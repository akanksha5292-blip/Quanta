import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ProfileClient } from "@/components/layout/ProfileClient";
import { addIstCalendarDays, formatIstDate } from "@/lib/ist";

export default async function ProfilePage() {
  const user = await currentUser();
  const { userId } = await auth();
  if (!userId || !user) return null;

  const supabase = createServiceRoleClient();
  const { data: row } = await supabase.from("users").select("*").eq("clerk_id", userId).single();
  if (!row?.id) redirect("/sign-up");

  const { data: pendingRows } = await supabase
    .from("friendships")
    .select("id, requester_id")
    .eq("addressee_id", row.id)
    .eq("status", "pending");

  const requesterIds = Array.from(
    new Set((pendingRows ?? []).map((p) => p.requester_id).filter((id): id is string => Boolean(id))),
  );
  const { data: requesters } =
    requesterIds.length > 0
      ? await supabase.from("users").select("id,username,display_name").in("id", requesterIds)
      : { data: [] as { id: string; username: string | null; display_name: string | null }[] };

  const rmap = new Map((requesters ?? []).map((u) => [u.id, u]));
  const pending = (pendingRows ?? []).map((p) => ({
    id: p.id,
    requester: p.requester_id ? rmap.get(p.requester_id) ?? null : null,
  }));

  const { data: earnedBadges } = await supabase.from("user_badges").select("badge_type").eq("user_id", row.id);
  const earned = new Set((earnedBadges ?? []).map((b) => b.badge_type));

  const start = addIstCalendarDays(-89);
  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("date, status, round_scores")
    .eq("user_id", row.id)
    .eq("status", "completed")
    .gte("date", start);

  const playedDates = (sessions ?? []).map((s) => s.date);
  const roundTotals = { guesstimate: 0, warmup: 0, gk: 0, wordplay: 0, judgment: 0, n: 0 };
  for (const s of sessions ?? []) {
    const rs = s.round_scores as Record<string, unknown> | null;
    if (!rs) continue;
    roundTotals.n += 1;
    if (typeof rs.guesstimate === "number") roundTotals.guesstimate += rs.guesstimate;
    if (typeof rs.warmup === "number") roundTotals.warmup += rs.warmup;
    if (Array.isArray(rs.gk)) roundTotals.gk += (rs.gk as number[]).reduce((a, b) => a + b, 0);
    if (typeof rs.wordplay === "number") roundTotals.wordplay += rs.wordplay;
    if (typeof rs.judgment === "number") roundTotals.judgment += rs.judgment;
  }
  const n = roundTotals.n || 1;
  const strength = {
    guesstimate: Math.round(roundTotals.guesstimate / n),
    warmup: Math.round(roundTotals.warmup / n),
    gk: Math.round(roundTotals.gk / n),
    wordplay: Math.round(roundTotals.wordplay / n),
    judgment: Math.round(roundTotals.judgment / n),
  };

  return (
    <main className="min-h-screen bg-[#07080C] p-6 text-white">
      <ProfileClient
        user={{
          imageUrl: user.imageUrl,
          firstName: user.firstName,
          username: row.username ?? "",
          displayName: row.display_name ?? "",
          streak: row.streak_current ?? 0,
          id: row.id,
        }}
        pending={pending}
        earnedBadgeIds={Array.from(earned)}
        playedDates={playedDates}
        strength={strength}
      />
      <p className="mt-8 text-xs text-zinc-500">Invite friends: /join?ref={row.id}</p>
      <p className="text-xs text-zinc-600">Today (IST): {formatIstDate()}</p>
    </main>
  );
}
