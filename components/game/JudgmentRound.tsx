"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Timer } from "@/components/game/Timer";
import { Card, CardContent } from "@/components/ui/card";

type Opt = { label: string; crowd: number; expert?: boolean };

type Props = {
  data: { scenario: string; options: Opt[]; questionId: string };
  onComplete: (score: number, newBadges?: { id: string; name: string; description: string }[]) => void;
};

export function JudgmentRound({ data, onComplete }: Props) {
  const [picked, setPicked] = useState<string | null>(null);

  const select = async (label: string) => {
    if (picked) return;
    setPicked(label);
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: data.questionId,
        answer: label,
        timingMs: 30000,
        roundType: "judgment",
      }),
    });
    const json = (await res.json()) as {
      score: number;
      newBadges?: { id: string; name: string; description: string }[];
    };
    onComplete(json.score, json.newBadges);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 text-white">
      <Timer durationSeconds={90} />
      <Card>
        <CardContent className="pt-6 text-sm leading-relaxed text-zinc-200">{data.scenario}</CardContent>
      </Card>
      <div className="space-y-3">
        {data.options.map((o) => (
          <button
            key={o.label}
            disabled={Boolean(picked)}
            onClick={() => select(o.label)}
            className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-left hover:border-[#F5C842]"
          >
            {o.expert && <span className="mr-2 text-[#F5C842]">★</span>}
            {o.label}
          </button>
        ))}
      </div>
      {picked && (
        <div className="space-y-2">
          {data.options.map((o) => (
            <div key={o.label} className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className="h-full bg-[#F5C842]"
                  initial={{ width: 0 }}
                  animate={{ width: `${o.crowd}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <span className="w-10 text-right text-xs text-zinc-400">{o.crowd}%</span>
            </div>
          ))}
          <p className="text-xs text-zinc-500">
            Expert reasoning: the starred stance reflects editorial consensus for this scenario.
          </p>
        </div>
      )}
    </div>
  );
}
