import { createServiceRoleClient } from "@/lib/supabase/admin";
import { formatIstDate } from "@/lib/ist";

const SAMPLE = [
  {
    notion_id: "dev-guess",
    type: "guesstimate",
    category: "Science",
    difficulty: "Medium",
    question: "How many billion trees are on Earth (order of magnitude)?",
    options: [],
    correct_answer: "300",
    guesstimate_unit: "billion trees",
    guesstimate_dist_min: 50,
    guesstimate_dist_max: 500,
    fun_fact: "Scientists estimate roughly 3 trillion trees on Earth.",
  },
  {
    notion_id: "dev-warmup",
    type: "warmup",
    category: "History",
    difficulty: "Easy",
    question: "The Great Wall of China is a single continuous wall built in one dynasty.",
    options: ["True", "False", "Partly true", "Unknown"],
    correct_answer: "False",
    fun_fact: "Multiple walls were built over centuries by different dynasties.",
  },
  {
    notion_id: "dev-gk-1",
    type: "gk",
    category: "Geography",
    difficulty: "Easy",
    question: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Perth"],
    correct_answer: "Canberra",
    fun_fact: "Canberra was selected as a compromise between Sydney and Melbourne.",
  },
  {
    notion_id: "dev-gk-2",
    type: "gk",
    category: "Science",
    difficulty: "Medium",
    question: "What gas do plants absorb from the atmosphere for photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    correct_answer: "Carbon dioxide",
    fun_fact: "Plants release oxygen as a byproduct.",
  },
  {
    notion_id: "dev-gk-3",
    type: "gk",
    category: "Tech",
    difficulty: "Hard",
    question: "Who co-founded Apple with Steve Jobs?",
    options: ["Bill Gates", "Steve Wozniak", "Tim Cook", "Paul Allen"],
    correct_answer: "Steve Wozniak",
    fun_fact: "Wozniak designed the Apple I and Apple II.",
  },
  {
    notion_id: "dev-wordplay",
    type: "wordplay",
    category: "Nature",
    difficulty: "Medium",
    question: "Unscramble: THUNDER (weather phenomenon)",
    options: ["T", "H", "U", "N", "D", "E", "R"],
    correct_answer: "THUNDER",
    fun_fact: "The speed of sound is much slower than light.",
  },
  {
    notion_id: "dev-judge",
    type: "judgment",
    category: "Politics",
    difficulty: "Hard",
    question: "A city should ban private cars in the downtown core on weekdays.",
    options: [
      "Ban immediately — climate and health demand it",
      "Pilot congestion pricing first, then evaluate a ban",
      "Invest only in public transit, no ban",
    ],
    correct_answer: "Pilot congestion pricing first, then evaluate a ban",
    fun_fact: "Many cities use phased pilots before hard bans.",
  },
] as const;

export async function seedTodayDailySet(date = formatIstDate()) {
  const supabase = createServiceRoleClient();

  for (const row of SAMPLE) {
    await supabase.from("questions").upsert(
      {
        ...row,
        options: row.options.length ? [...row.options] : null,
      },
      { onConflict: "notion_id" },
    );
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, notion_id")
    .in(
      "notion_id",
      SAMPLE.map((s) => s.notion_id),
    );

  const byNotion = new Map((questions ?? []).map((q) => [q.notion_id, q.id]));

  const guesstimateId = byNotion.get("dev-guess");
  const warmupId = byNotion.get("dev-warmup");
  const gkIds = ["dev-gk-1", "dev-gk-2", "dev-gk-3"]
    .map((k) => byNotion.get(k))
    .filter((id): id is string => Boolean(id));
  const wordplayId = byNotion.get("dev-wordplay");
  const judgmentId = byNotion.get("dev-judge");

  if (!guesstimateId || !warmupId || gkIds.length !== 3 || !wordplayId || !judgmentId) {
    throw new Error("Failed to resolve seeded question IDs");
  }

  await supabase.from("daily_sets").upsert(
    {
      date,
      guesstimate_id: guesstimateId,
      warmup_id: warmupId,
      gk_ids: gkIds,
      wordplay_id: wordplayId,
      judgment_id: judgmentId,
      published_at: new Date().toISOString(),
    },
    { onConflict: "date" },
  );

  return { date, questionIds: [...byNotion.values()] };
}
