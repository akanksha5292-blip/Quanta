import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[clerk webhook]", evt.type, evt.data);

  const supabase = createServiceRoleClient();

  try {
    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, image_url } = evt.data;
      const primaryEmail =
        email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address ??
        email_addresses?.[0]?.email_address ??
        "";
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const base = (first_name ?? "player").replace(/\s+/g, "").toLowerCase() || "player";
      const username = `${base}${suffix}`;

      const { error } = await supabase.from("users").upsert(
        {
          clerk_id: id,
          username,
          email: primaryEmail || "unknown@placeholder.local",
          display_name: first_name ?? null,
          avatar_url: image_url ?? null,
        },
        { onConflict: "clerk_id", ignoreDuplicates: true },
      );

      if (error) {
        console.error("[clerk webhook] insert user failed", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (evt.type === "user.deleted") {
      const id = evt.data.id;
      if (!id) {
        return NextResponse.json({ ok: true });
      }
      const { error } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("clerk_id", id);

      if (error) {
        console.error("[clerk webhook] soft delete failed", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } catch (e) {
    console.error("[clerk webhook] unexpected", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
