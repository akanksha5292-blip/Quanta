import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { friendshipId?: string; status?: "accepted" | "declined" };
  if (!body.friendshipId || !body.status) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!me) return NextResponse.json({ error: "No user" }, { status: 400 });

  const { data: f } = await supabase.from("friendships").select("*").eq("id", body.friendshipId).single();
  if (!f || f.addressee_id !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("friendships").update({ status: body.status }).eq("id", body.friendshipId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
