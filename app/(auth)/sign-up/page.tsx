import { SignUp } from "@clerk/nextjs";
import { isClerkFullyConfigured } from "@/lib/config";

export default function SignUpPage() {
  if (!isClerkFullyConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080C] p-6 text-center text-zinc-400">
        <p>
          Clerk is not configured. Add{" "}
          <code className="text-[#F5C842]">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="text-[#F5C842]">CLERK_SECRET_KEY</code> to your environment (local:{" "}
          <code className="text-[#F5C842]">.env.local</code>, production: Vercel → Settings →
          Environment Variables), then redeploy.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080C]">
      <SignUp
        routing="path"
        path="/sign-up"
        appearance={{ variables: { colorPrimary: "#F5C842" } }}
      />
    </main>
  );
}
