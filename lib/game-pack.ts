import type { QuestionDTO } from "@/types";

export type PackedDailySet = {
  date: string;
  guesstimate: QuestionDTO | null;
  warmup: QuestionDTO | null;
  gk: QuestionDTO[];
  wordplay: QuestionDTO | null;
  judgment: QuestionDTO | null;
};

export function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw ? [raw] : [];
    }
  }
  return [];
}

export function packDailySet(date: string, questions: QuestionDTO[]): PackedDailySet {
  const byType = (t: string) => questions.filter((q) => q.type === t);
  const gk = byType("gk").slice(0, 3);

  return {
    date,
    guesstimate: byType("guesstimate")[0] ?? null,
    warmup: byType("warmup")[0] ?? null,
    gk,
    wordplay: byType("wordplay")[0] ?? null,
    judgment: byType("judgment")[0] ?? null,
  };
}

export function isPackComplete(pack: PackedDailySet): boolean {
  return Boolean(
    pack.guesstimate &&
      pack.warmup &&
      pack.gk.length === 3 &&
      pack.wordplay &&
      pack.judgment,
  );
}

/** Scramble letters for wordplay tiles (answer letters only — from server `options` JSON). */
export function wordplayTiles(question: QuestionDTO): { letters: string[]; slots: number } {
  const opts = parseOptions(question.options);
  if (opts.length > 0) {
    return { letters: opts, slots: opts.length };
  }
  const word = question.question.replace(/[^a-zA-Z]/g, "");
  const letters = word.split("").sort(() => Math.random() - 0.5);
  return { letters, slots: letters.length };
}

export function judgmentOptions(question: QuestionDTO): { label: string; crowd: number; expert?: boolean }[] {
  const opts = parseOptions(question.options);
  const base = opts.length >= 3 ? opts : ["Option A", "Option B", "Option C"];
  return base.slice(0, 3).map((label, i) => ({
    label,
    crowd: [42, 35, 23][i] ?? 20,
    expert: i === 0,
  }));
}
