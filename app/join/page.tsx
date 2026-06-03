import { createServiceRoleClient } from "@/lib/supabase/admin";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserFromClerk } from "@/lib/users";

export default async function JoinPage({ searchParams }: { searchParams: { ref?: string } }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const ref = searchParams.ref;
  if (!ref) {
    return <main className="p-8 text-white">Missing invite code.</main>;
  }

  const clerkUser = await currentUser();
  const meId = await ensureUserFromClerk(userId, {
    firstName: clerkUser?.firstName ?? null,
    imageUrl: clerkUser?.imageUrl ?? null,
  });

  const supabase = createServiceRoleClient();
  const me = { id: meId };
  const { data: target } = await supabase.from("users").select("id").eq("id", ref).maybeSingle();
  if (!target?.id || me.id === target.id) {
    return <main className="p-8 text-white">Invalid invite link.</main>;
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: me.id,
    addressee_id: target.id,
    status: "pending",
  });

  if (error && error.code !== "23505") {
    return <main className="p-8 text-white">Could not send request.</main>;
  }

  redirect("/profile");
}
