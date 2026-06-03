import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { isRedisConfigured } from "@/lib/config";

let gameTodayRatelimit: Ratelimit | null = null;
let shareCardRatelimit: Ratelimit | null = null;

export function getGameTodayRatelimit() {
  if (!gameTodayRatelimit) {
    gameTodayRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(60, "60 s"),
      prefix: "ratelimit:game-today",
    });
  }
  return gameTodayRatelimit;
}

function getShareCardRatelimit() {
  if (!shareCardRatelimit) {
    shareCardRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(10, "60 s"),
      prefix: "ratelimit:share-card",
    });
  }
  return shareCardRatelimit;
}

export async function rateLimitShareCard(clerkId: string): Promise<NextResponse | null> {
  if (!isRedisConfigured()) return null;
  const { success } = await getShareCardRatelimit().limit(clerkId);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}
