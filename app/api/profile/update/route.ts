import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { display_name?: string };
  if (!body.display_name) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: u } = await supabase.from("users").select("id,username").eq("clerk_id", userId).single();
  if (!u) return NextResponse.json({ error: "No user" }, { status: 400 });

  const { error } = await supabase.from("users").update({ display_name: body.display_name }).eq("id", u.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
