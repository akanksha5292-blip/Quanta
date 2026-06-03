import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { formatIstDate, istHour } from "@/lib/ist";
import { isOneSignalConfigured } from "@/lib/config";
import { sendOneSignalPush } from "@/lib/onesignal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  if (!isOneSignalConfigured()) {
    return NextResponse.json({ ok: true, skipped: "OneSignal not configured" });
  }

  const hour = istHour();
  const today = formatIstDate();
  const supabase = createServiceRoleClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, preferred_reminder_hour, clerk_id")
    .eq("preferred_reminder_hour", hour)
    .is("deleted_at", null);

  const bodies = [
    "3 minutes. How sharp are you today?",
    "New guesstimate dropped. Think you're close?",
    "Your friends are already playing.",
  ];

  let sent = 0;

  for (const u of users ?? []) {
    if (!u.clerk_id) continue;

    const { data: session } = await supabase
      .from("game_sessions")
      .select("id")
      .eq("user_id", u.id)
      .eq("date", today)
      .eq("status", "completed")
      .maybeSingle();

    if (session) continue;

    const { data: userRow } = await supabase
      .from("users")
      .select("streak_current")
      .eq("id", u.id)
      .single();

    const streak = userRow?.streak_current ?? 0;
    const pick = bodies[Math.floor(Math.random() * bodies.length)]!;
    const body =
      Math.random() < 0.25
        ? `Day ${streak} streak on the line. Don't break it.`
        : pick;

    const ok = await sendOneSignalPush({
      clerkId: u.clerk_id,
      heading: "Today's QUANTA is live",
      body,
    });
    if (ok) sent += 1;
  }

  return NextResponse.json({ ok: true, hour, processed: users?.length ?? 0, sent });
}
