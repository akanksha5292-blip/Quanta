import { Client } from "@notionhq/client";
import type {
  CreatePageParameters,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

type NotionProps = PageObjectResponse["properties"];
type NotionProp = NotionProps[string];

let notionClient: Client | null = null;
export function getNotion() {
  if (!notionClient) {
    notionClient = new Client({
      auth: process.env.NOTION_API_KEY,
      notionVersion: "2022-06-28",
    });
  }
  return notionClient;
}

export type NotionQuestionType =
  | "guesstimate"
  | "warmup"
  | "gk"
  | "wordplay"
  | "judgment";

export type NotionCategory =
  | "Food"
  | "Space"
  | "History"
  | "Nature"
  | "Politics"
  | "Science"
  | "People"
  | "Animals"
  | "Geography"
  | "Tech";

export type NotionDifficulty = "Easy" | "Medium" | "Hard";
export type NotionStatus = "Draft" | "Published" | "Scheduled" | "Used";

export interface NotionQuestionRow {
  notionPageId: string;
  name: string;
  type: NotionQuestionType;
  category: NotionCategory;
  difficulty: NotionDifficulty;
  options: string[];
  correctAnswer: string;
  guesstimatUnit: string | null;
  guesstimatMin: number | null;
  guesstimatMax: number | null;
  funFact: string | null;
  source: string | null;
  bizarreScore: number | null;
  status: NotionStatus;
}

function titlePlain(prop: NotionProp | undefined): string {
  if (!prop || !("title" in prop)) return "";
  return prop.title.map((t) => t.plain_text).join("");
}

function richTextPlain(prop: NotionProp | undefined): string {
  if (!prop || !("rich_text" in prop)) return "";
  return prop.rich_text.map((t) => t.plain_text).join("");
}

function selectName(prop: NotionProp | undefined): string | null {
  if (!prop || !("select" in prop)) return null;
  return prop.select?.name ?? null;
}

function parseOptionsJson(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String);
  } catch {
    return [];
  }
}

function mapPage(page: PageObjectResponse): NotionQuestionRow {
  const props = page.properties;
  const optionsRaw = richTextPlain(props["Options"]);
  let options: string[] = [];
  try {
    options = parseOptionsJson(optionsRaw);
  } catch {
    options = [];
  }

  return {
    notionPageId: page.id,
    name: titlePlain(props["Name"]),
    type: (selectName(props["Type"]) ?? "gk") as NotionQuestionType,
    category: (selectName(props["Category"]) ?? "Science") as NotionCategory,
    difficulty: (selectName(props["Difficulty"]) ?? "Medium") as NotionDifficulty,
    options,
    correctAnswer: richTextPlain(props["CorrectAnswer"]),
    guesstimatUnit: richTextPlain(props["GuesstimatUnit"]) || null,
    guesstimatMin:
      props["GuesstimatMin"] && "number" in props["GuesstimatMin"] && props["GuesstimatMin"].number != null
        ? Number(props["GuesstimatMin"].number)
        : null,
    guesstimatMax:
      props["GuesstimatMax"] && "number" in props["GuesstimatMax"] && props["GuesstimatMax"].number != null
        ? Number(props["GuesstimatMax"].number)
        : null,
    funFact: richTextPlain(props["FunFact"]) || null,
    source:
      props["Source"] && "url" in props["Source"] ? (props["Source"].url ?? null) : null,
    bizarreScore:
      props["BizarreScore"] && "number" in props["BizarreScore"] && props["BizarreScore"].number != null
        ? Number(props["BizarreScore"].number)
        : null,
    status: (selectName(props["Status"]) ?? "Draft") as NotionStatus,
  };
}

export async function fetchPublishedQuestions(): Promise<NotionQuestionRow[]> {
  const db = process.env.NOTION_QUESTIONS_DB_ID;
  if (!db) throw new Error("NOTION_QUESTIONS_DB_ID is not set");

  const res = await getNotion().databases.query({
    database_id: db,
    filter: {
      property: "Status",
      select: { equals: "Published" },
    },
  });

  return res.results.flatMap((page) => {
    if (!("properties" in page)) return [];
    try {
      return [mapPage(page as PageObjectResponse)];
    } catch {
      return [];
    }
  });
}

export type DraftQuestionInput = Omit<NotionQuestionRow, "notionPageId" | "status">;

export async function createDraftQuestions(questions: DraftQuestionInput[]): Promise<void> {
  const db = process.env.NOTION_QUESTIONS_DB_ID;
  if (!db) throw new Error("NOTION_QUESTIONS_DB_ID is not set");

  for (const q of questions) {
    const properties: CreatePageParameters["properties"] = {
      Name: { title: [{ type: "text", text: { content: q.name } }] },
      Type: { select: { name: q.type } },
      Category: { select: { name: q.category } },
      Difficulty: { select: { name: q.difficulty } },
      Options: {
        rich_text: [{ type: "text", text: { content: JSON.stringify(q.options) } }],
      },
      CorrectAnswer: {
        rich_text: [{ type: "text", text: { content: q.correctAnswer } }],
      },
      FunFact: {
        rich_text: q.funFact
          ? [{ type: "text", text: { content: q.funFact } }]
          : [],
      },
      Status: { select: { name: "Draft" } },
    };

    if (q.guesstimatUnit) {
      properties["GuesstimatUnit"] = {
        rich_text: [{ type: "text", text: { content: q.guesstimatUnit } }],
      };
    }
    if (q.guesstimatMin != null) {
      properties["GuesstimatMin"] = { number: q.guesstimatMin };
    }
    if (q.guesstimatMax != null) {
      properties["GuesstimatMax"] = { number: q.guesstimatMax };
    }
    if (q.source) {
      properties["Source"] = { url: q.source };
    }
    if (q.bizarreScore != null) {
      properties["BizarreScore"] = { number: q.bizarreScore };
    }

    await getNotion().pages.create({
      parent: { database_id: db },
      properties,
    });
  }
}
