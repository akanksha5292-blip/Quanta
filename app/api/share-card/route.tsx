import { auth } from "@clerk/nextjs/server";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getRedis } from "@/lib/redis";
import { isRedisConfigured } from "@/lib/config";
import { rateLimitShareCard } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitShareCard(clerkId);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");
  if (!userId || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: me } = await supabase.from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  if (!me?.id || me.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = `share:${userId}:${date}`;
  if (isRedisConfigured()) {
    const cached = await getRedis().get<string>(key);
    if (cached) {
      const buf = Buffer.from(cached, "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=604800",
        },
      });
    }
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  const { data: lb } = await supabase
    .from("leaderboard_daily")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (!user || !lb) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("round_scores, total_score")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  const rs = (session?.round_scores ?? {}) as Record<string, number | number[] | undefined>;
  const gkArr = Array.isArray(rs.gk) ? rs.gk : [];
  const pills = [
    rs.guesstimate ?? 0,
    rs.warmup ?? 0,
    gkArr.reduce((a, b) => a + b, 0),
    rs.wordplay ?? 0,
    rs.judgment ?? 0,
  ];
  const total = session?.total_score ?? lb.score;
  const beatPct = lb.rank_percentile ?? 0;
  const topPct = Math.max(1, Math.min(99, Math.round(100 - beatPct)));
  const streak = user.streak_current ?? 0;

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07080C",
          color: "white",
          padding: 48,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ color: "#F5C842", fontSize: 42, fontWeight: 700 }}>QUANTA</div>
          <div style={{ marginLeft: 16, color: "#9CA3AF", fontSize: 32 }}>{date}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontSize: 120, color: "#F5C842", fontWeight: 800 }}>{total}</div>
          <div style={{ fontSize: 48, color: "#6B7280" }}>/500</div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
          {["◎", "✦", "⚡", "≋", "⊕"].map((icon, i) => (
            <div
              key={i}
              style={{
                borderRadius: 999,
                padding: "10px 18px",
                background: "#111827",
                color: "#F5C842",
                fontSize: 22,
              }}
            >
              {icon} {pills[i]}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
          <div
            style={{
              color: topPct <= 25 ? "#22C55E" : topPct <= 50 ? "#F5C842" : "#9CA3AF",
              fontSize: 28,
            }}
          >
            Top {topPct}%
          </div>
          <div style={{ fontSize: 28 }}>🔥 {streak}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );

  const png = await img.arrayBuffer();
  if (isRedisConfigured()) {
    const b64 = Buffer.from(png).toString("base64");
    await getRedis().set(key, b64, { ex: 60 * 60 * 24 * 7 });
  }

  return new NextResponse(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
