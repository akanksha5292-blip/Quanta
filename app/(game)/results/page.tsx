import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ResultsView } from "@/components/layout/ResultsView";
import { isClerkFullyConfigured } from "@/lib/config";

export default async function ResultsPage() {
  let userInternalId = "";

  if (isClerkFullyConfigured()) {
    const { userId } = await auth();
    if (!userId) return null;
    const supabase = createServiceRoleClient();
    const { data: row } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();
    userInternalId = row?.id ?? "";
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#07080C] px-4 py-8 text-white">
      <ResultsView userInternalId={userInternalId} />
    </main>
  );
}
