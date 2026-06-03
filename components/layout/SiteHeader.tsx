"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { isClerkFullyConfigured } from "@/lib/config";

const links = [
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const clerk = isClerkFullyConfigured();

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  return (
    <header className="border-b border-zinc-800/80 bg-[#07080C]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[#F5C842]">
          QUANTA
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
          {clerk ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button type="button" className="text-[#F5C842] hover:underline">
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton appearance={{ variables: { colorPrimary: "#F5C842" } }} />
              </SignedIn>
            </>
          ) : (
            <Link href="/sign-in" className="text-[#F5C842] hover:underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
