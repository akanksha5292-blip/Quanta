import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = new URL(req.url).searchParams.get("username")?.trim();
  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, reason: "Too short" });
  }

  const supabase = createServiceRoleClient();
  const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).maybeSingle();
  const { data: clash } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  const available = !clash || (me?.id != null && clash.id === me.id);
  return NextResponse.json({ available });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { username?: string };
  const username = body.username?.trim();
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).maybeSingle();
  if (!me?.id) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: clash } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (clash && clash.id !== me.id) {
    return NextResponse.json({ error: "Username taken" }, { status: 409 });
  }

  const { error } = await supabase.from("users").update({ username }).eq("clerk_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
