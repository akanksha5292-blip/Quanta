"use client";

import { PostHogProvider } from "@/components/layout/PostHogProvider";
import { OneSignalInit } from "@/components/layout/OneSignalInit";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <OneSignalInit />
      {children}
    </PostHogProvider>
  );
}
