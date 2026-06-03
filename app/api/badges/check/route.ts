import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { runBadgeCheck } from "@/lib/badge-check";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { userId?: string; date?: string };
  if (!body.userId || !body.date) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: row } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!row || row.id !== body.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newBadges = await runBadgeCheck(body.userId, body.date);
  return NextResponse.json({ newBadges });
}
