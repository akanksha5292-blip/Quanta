"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center text-white">
      <h1 className="text-xl font-semibold text-[#F5C842]">Something went wrong</h1>
      <p className="text-sm text-zinc-400">{error.message || "An unexpected error occurred."}</p>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
