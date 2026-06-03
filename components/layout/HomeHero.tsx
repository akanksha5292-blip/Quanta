"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
export function HomeHero({
  today,
  clerkReady,
  devPanel,
}: {
  today: string;
  clerkReady: boolean;
  devPanel?: React.ReactNode;
}) {
  const clerk = clerkReady;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-lg flex-col items-center justify-center px-6 py-16 text-center text-white">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">{today} · IST</p>
      <h1 className="mb-3 text-4xl font-bold tracking-tight text-[#F5C842]">QUANTA</h1>
      <p className="mb-10 max-w-sm text-sm leading-relaxed text-zinc-400">
        Five rounds. Three minutes. One daily challenge — guesstimate, trivia, wordplay, and judgment.
      </p>

      {clerk ? (
        <>
          <SignedIn>
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href="/play">Play today</Link>
            </Button>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg" className="min-w-[200px]">
                Sign in to play
              </Button>
            </SignInButton>
          </SignedOut>
        </>
      ) : (
        <div className="space-y-3">
          <Button asChild size="lg" className="min-w-[200px]">
            <Link href="/play">Play today</Link>
          </Button>
          <p className="text-xs text-zinc-500">
            Add Clerk keys to <code className="text-zinc-400">.env.local</code> to save scores.
          </p>
        </div>
      )}

      {devPanel}

      <div className="mt-12 flex gap-6 text-sm text-zinc-500">
        <Link href="/leaderboard" className="hover:text-[#F5C842]">
          Leaderboard
        </Link>
        <Link href="/profile" className="hover:text-[#F5C842]">
          Profile
        </Link>
      </div>
    </main>
  );
}
