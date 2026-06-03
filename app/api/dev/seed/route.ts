import { NextResponse } from "next/server";
import { seedTodayDailySet } from "@/lib/dev-seed";
import { getRedis } from "@/lib/redis";
import { isRedisConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const secret = process.env.DEV_SEED_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { date, questionIds } = await seedTodayDailySet();

    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.del(`daily_set:${date}`);
    }

    return NextResponse.json({ ok: true, date, questionIds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
