import { Redis } from "@upstash/redis";
import { isRedisConfigured } from "@/lib/config";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}
