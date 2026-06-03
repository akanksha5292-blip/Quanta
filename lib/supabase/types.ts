export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRow = {
  id: string;
  clerk_id: string;
  username: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  streak_current: number | null;
  streak_longest: number | null;
  streak_last_played: string | null;
  total_games_played: number | null;
  preferred_reminder_hour: number | null;
  deleted_at: string | null;
  created_at: string | null;
};

export type QuestionRow = {
  id: string;
  notion_id: string;
  type: string | null;
  category: string;
  difficulty: string | null;
  question: string;
  options: Json | null;
  correct_answer: string;
  guesstimate_unit: string | null;
  guesstimate_dist_min: number | null;
  guesstimate_dist_max: number | null;
  fun_fact: string | null;
  source: string | null;
  week_theme: string | null;
  bizarre_score: number | null;
  used_on: string | null;
  created_at: string | null;
};

export type DailySetRow = {
  id: string;
  date: string;
  guesstimate_id: string | null;
  warmup_id: string | null;
  gk_ids: string[];
  wordplay_id: string | null;
  judgment_id: string | null;
  published_at: string | null;
  created_at: string | null;
};

export type GameSessionRow = {
  id: string;
  user_id: string | null;
  daily_set_id: string | null;
  date: string;
  status: string | null;
  total_score: number | null;
  round_scores: Json | null;
  time_taken_seconds: number | null;
  completed_at: string | null;
  created_at: string | null;
};

export type LeaderboardDailyRow = {
  id: string;
  user_id: string | null;
  date: string;
  score: number;
  rank_global: number | null;
  rank_percentile: number | null;
};

export type FriendshipRow = {
  id: string;
  requester_id: string | null;
  addressee_id: string | null;
  status: string | null;
};

export type UserBadgeRow = {
  id: string;
  user_id: string | null;
  badge_type: string;
  earned_at: string | null;
};

export type PipelineLogRow = {
  id: string;
  log_date: string;
  status: string;
  wiki_events_count: number | null;
  news_count: number | null;
  created_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { clerk_id: string; email: string };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      questions: {
        Row: QuestionRow;
        Insert: Partial<QuestionRow> & { notion_id: string; category: string; question: string; correct_answer: string };
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      daily_sets: {
        Row: DailySetRow;
        Insert: Partial<DailySetRow> & { date: string; gk_ids: string[] };
        Update: Partial<DailySetRow>;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSessionRow;
        Insert: Partial<GameSessionRow> & { date: string };
        Update: Partial<GameSessionRow>;
        Relationships: [];
      };
      leaderboard_daily: {
        Row: LeaderboardDailyRow;
        Insert: Partial<LeaderboardDailyRow> & { date: string; score: number };
        Update: Partial<LeaderboardDailyRow>;
        Relationships: [];
      };
      friendships: {
        Row: FriendshipRow;
        Insert: Partial<FriendshipRow>;
        Update: Partial<FriendshipRow>;
        Relationships: [];
      };
      user_badges: {
        Row: UserBadgeRow;
        Insert: Partial<UserBadgeRow> & { badge_type: string };
        Update: Partial<UserBadgeRow>;
        Relationships: [];
      };
      pipeline_logs: {
        Row: PipelineLogRow;
        Insert: Partial<PipelineLogRow> & { log_date: string; status: string };
        Update: Partial<PipelineLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
