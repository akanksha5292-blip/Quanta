export type BadgeId =
  | "first_game"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "perfect_gk"
  | "estimation_beast"
  | "speed_demon"
  | "century"
  | "top_10_percent"
  | "early_bird";

export const BADGE_DEFINITIONS: Record<
  BadgeId,
  { name: string; description: string; icon?: string }
> = {
  first_game: {
    name: "First Steps",
    description: "Complete your first game",
  },
  streak_3: {
    name: "On a Roll",
    description: "3-day streak",
  },
  streak_7: {
    name: "Week Warrior",
    description: "7-day streak",
  },
  streak_30: {
    name: "Monthly Legend",
    description: "30-day streak",
  },
  perfect_gk: {
    name: "Triple Threat",
    description: "3/3 GK correct in one game",
  },
  estimation_beast: {
    name: "Estimation Beast",
    description: "Guesstimate within 5% (score 100)",
  },
  speed_demon: {
    name: "Speed Demon",
    description: "GK round under 20s total",
  },
  century: {
    name: "Century Club",
    description: "Play 100 games",
  },
  top_10_percent: {
    name: "Elite",
    description: "Finish in top 10% globally",
  },
  early_bird: {
    name: "Early Bird",
    description: "Play before 8am IST",
  },
};
