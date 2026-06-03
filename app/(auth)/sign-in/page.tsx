import { SignIn } from "@clerk/nextjs";
import { isClerkFullyConfigured } from "@/lib/config";

export default function SignInPage() {
  if (!isClerkFullyConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080C] p-6 text-center text-zinc-400">
        <p>Add Clerk keys to <code className="text-[#F5C842]">.env.local</code> to enable sign-in.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080C]">
      <SignIn
        routing="path"
        path="/sign-in"
        appearance={{ variables: { colorPrimary: "#F5C842" } }}
      />
    </main>
  );
}
