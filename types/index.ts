export type QuestionDTO = {
  id: string;
  type: string;
  question: string;
  options?: unknown;
  difficulty?: string | null;
  guesstimate_unit?: string | null;
  guesstimate_dist_min?: number | null;
  guesstimate_dist_max?: number | null;
};

export type DailySetDTO = {
  date: string;
  questions: QuestionDTO[];
};
