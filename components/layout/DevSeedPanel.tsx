"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DevSeedPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const seed = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; date?: string; error?: string };
      if (!res.ok) {
        setMsg(json.error ?? `Seed failed (${res.status}) — check Supabase env vars`);
      } else {
        setMsg(`Seeded daily set for ${json.date}. Go to Play.`);
      }
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 w-full max-w-sm rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-4 text-left">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Developer</p>
      <p className="mb-3 text-xs text-zinc-400">
        Load sample questions into Supabase for today (requires Supabase keys in .env.local).
      </p>
      <Button type="button" variant="outline" size="sm" onClick={seed} disabled={busy}>
        {busy ? "Seeding…" : "Seed today’s game"}
      </Button>
      {msg && <p className="mt-2 text-xs text-zinc-300">{msg}</p>}
    </div>
  );
}
