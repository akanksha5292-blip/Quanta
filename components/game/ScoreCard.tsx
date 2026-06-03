"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Props = {
  total: number;
  rounds: { label: string; score: number }[];
  percentileTop: number;
  shareText: string;
};

export function ScoreCard({ total, rounds, percentileTop, shareText }: Props) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(total * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 text-white">
      <div className="text-center">
        <div className="text-5xl font-bold text-[#F5C842]">{display}</div>
        <div className="text-sm text-zinc-500">out of 500</div>
        <div className="mt-2 text-sm text-emerald-400">Top {percentileTop}% today</div>
      </div>
      <div className="space-y-3">
        {rounds.map((r, i) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>{r.label}</span>
              <span>{r.score}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full bg-[#F5C842]"
                initial={{ width: 0 }}
                animate={{ width: `${(r.score / 100) * 100}%` }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(shareText);
        }}
      >
        Copy share text
      </Button>
    </div>
  );
}
