import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

type LeaderType = "global" | "friends";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "friends") as LeaderType;
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!me?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const redis = getRedis();
  const cacheKey =
    type === "global" ? `leaderboard:global:${date}` : `leaderboard:friends:${me.id}:${date}`;
  const ttl = type === "global" ? 300 : 120;
  const cached = await redis.get<string>(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  async function hydrate(rows: { user_id: string | null }[] | null) {
    const list = rows ?? [];
    const ids = Array.from(
      new Set(list.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
    );
    if (!ids.length) {
      return list.map((r) => ({ ...r, user: null }));
    }
    const { data: users } = await supabase
      .from("users")
      .select("id,username,display_name,avatar_url")
      .in("id", ids);
    const map = new Map((users ?? []).map((u) => [u.id, u]));
    return list.map((r) => ({
      ...r,
      user: r.user_id ? map.get(r.user_id) ?? null : null,
    }));
  }

  if (type === "global") {
    const { data: rows } = await supabase
      .from("leaderboard_daily")
      .select("*")
      .eq("date", date)
      .order("score", { ascending: false })
      .limit(100);

    const { data: mine } = await supabase
      .from("leaderboard_daily")
      .select("*")
      .eq("date", date)
      .eq("user_id", me.id)
      .maybeSingle();

    const list = await hydrate(rows);
    const inList = list.some((r) => r.user_id === me.id);
    const payload = { meId: me.id, rows: inList || !mine ? list : [...list, ...(await hydrate([mine]))] };
    await redis.set(cacheKey, JSON.stringify(payload), { ex: ttl });
    return NextResponse.json(payload);
  }

  const { data: friends } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`);

  const friendIds = new Set<string>();
  friends?.forEach((f) => {
    if (f.requester_id && f.requester_id !== me.id) friendIds.add(f.requester_id);
    if (f.addressee_id && f.addressee_id !== me.id) friendIds.add(f.addressee_id);
  });
  friendIds.add(me.id);

  const ids = Array.from(friendIds);
  const { data: rows } = await supabase
    .from("leaderboard_daily")
    .select("*")
    .eq("date", date)
    .in("user_id", ids)
    .order("score", { ascending: false })
    .limit(100);

  const { data: mine } = await supabase
    .from("leaderboard_daily")
    .select("*")
    .eq("date", date)
    .eq("user_id", me.id)
    .maybeSingle();

  const list = await hydrate(rows);
  const inList = list.some((r) => r.user_id === me.id);
  const payload = { meId: me.id, rows: inList || !mine ? list : [...list, ...(await hydrate([mine]))] };
  await redis.set(cacheKey, JSON.stringify(payload), { ex: ttl });
  return NextResponse.json(payload);
}
