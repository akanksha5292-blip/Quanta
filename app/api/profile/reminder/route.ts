import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("users")
    .select("preferred_reminder_hour")
    .eq("clerk_id", userId)
    .maybeSingle();

  return NextResponse.json({ preferred_reminder_hour: data?.preferred_reminder_hour ?? 9 });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { preferred_reminder_hour?: number };
  if (body.preferred_reminder_hour === undefined) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("users")
    .update({ preferred_reminder_hour: body.preferred_reminder_hour })
    .eq("clerk_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
