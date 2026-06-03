import { createServiceRoleClient } from "@/lib/supabase/admin";
import { BADGE_DEFINITIONS, type BadgeId } from "@/lib/badges";

type RoundScores = {
  guesstimate?: number;
  gk?: number[];
  judgment?: number;
  wordplay?: number;
  warmup?: number;
  _gkElapsedMs?: number;
};

export async function runBadgeCheck(userInternalId: string, dateIst: string) {
  const supabase = createServiceRoleClient();
  const newBadges: { id: BadgeId; name: string; description: string }[] = [];

  const { data: user } = await supabase.from("users").select("*").eq("id", userInternalId).single();
  if (!user) return newBadges;

  const { data: earned } = await supabase.from("user_badges").select("badge_type").eq("user_id", userInternalId);
  const earnedSet = new Set((earned ?? []).map((e) => e.badge_type as BadgeId));

  const { data: todaySession } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", userInternalId)
    .eq("date", dateIst)
    .maybeSingle();

  const { data: todayLb } = await supabase
    .from("leaderboard_daily")
    .select("*")
    .eq("user_id", userInternalId)
    .eq("date", dateIst)
    .maybeSingle();

  const totalGames = user.total_games_played ?? 0;
  const streak = user.streak_current ?? 0;

  const tryAward = async (id: BadgeId) => {
    if (earnedSet.has(id)) return;
    const def = BADGE_DEFINITIONS[id];
    if (!def) return;
    let ok = false;
    const rs = (todaySession?.round_scores ?? null) as RoundScores | null;
    switch (id) {
      case "first_game":
        ok = totalGames >= 1;
        break;
      case "streak_3":
        ok = streak >= 3;
        break;
      case "streak_7":
        ok = streak >= 7;
        break;
      case "streak_30":
        ok = streak >= 30;
        break;
      case "century":
        ok = totalGames >= 100;
        break;
      case "perfect_gk": {
        const gk = rs?.gk ?? [];
        ok = gk.length === 3 && gk.every((s) => s >= 95);
        break;
      }
      case "estimation_beast": {
        ok = rs?.guesstimate === 100;
        break;
      }
      case "speed_demon": {
        ok = (rs?._gkElapsedMs ?? 999999) < 20000;
        break;
      }
      case "top_10_percent": {
        const p = todayLb?.rank_percentile ?? 0;
        ok = p >= 90;
        break;
      }
      case "early_bird": {
        const parts = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          hour12: false,
        }).formatToParts(new Date());
        const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
        ok = hour < 8;
        break;
      }
      default:
        ok = false;
    }
    if (!ok) return;
    const { error } = await supabase.from("user_badges").insert({ user_id: userInternalId, badge_type: id });
    if (!error) {
      earnedSet.add(id);
      newBadges.push({ id, name: def.name, description: def.description });
    }
  };

  for (const id of Object.keys(BADGE_DEFINITIONS) as BadgeId[]) {
    await tryAward(id);
  }

  return newBadges;
}
