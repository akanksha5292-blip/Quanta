import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function ensureUserFromClerk(clerkId: string, profile?: {
  email?: string | null;
  firstName?: string | null;
  imageUrl?: string | null;
}) {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const base = (profile?.firstName ?? "player").replace(/\s+/g, "").toLowerCase() || "player";
  const username = `${base}${suffix}`;

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkId,
      username,
      email: profile?.email ?? `${clerkId}@clerk.placeholder`,
      display_name: profile?.firstName ?? null,
      avatar_url: profile?.imageUrl ?? null,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: retry } = await supabase.from("users").select("id").eq("clerk_id", clerkId).single();
    return retry?.id ?? null;
  }

  if (error) throw error;
  return created.id;
}
