"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Timer } from "@/components/game/Timer";
import { FunFactBox } from "@/components/game/FunFactBox";
import { Button } from "@/components/ui/button";

type Props = {
  data: { fact: string; options: string[]; questionId: string };
  onComplete: (score: number) => void;
};

export function WarmupRound({ data, onComplete }: Props) {
  const [phase, setPhase] = useState<"read" | "quiz" | "done">("read");
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; funFact?: string | null } | null>(null);

  const choose = async (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: data.questionId,
        answer: opt,
        timingMs: 15000,
        roundType: "warmup",
      }),
    });
    const json = (await res.json()) as { correct: boolean; score: number; funFact?: string | null };
    setResult({ correct: json.correct, funFact: json.funFact });
    setPhase("done");
    onComplete(json.score);
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 text-white">
      {phase === "read" && (
        <>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.02 }}
            className="text-2xl italic leading-relaxed text-zinc-200"
          >
            {data.fact.split(" ").map((w, i) => (
              <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                {w}{" "}
              </motion.span>
            ))}
          </motion.p>
          <Button onClick={() => setPhase("quiz")}>I&apos;ve read it — test me</Button>
        </>
      )}
      {(phase === "quiz" || phase === "done") && (
        <>
          <Timer durationSeconds={60} />
          <div className="grid grid-cols-2 gap-3">
            {data.options.map((o) => {
              const disabled = Boolean(picked);
              const tone =
                phase === "done" && result
                  ? o === picked
                    ? result.correct
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
                    : "border-zinc-800"
                  : "border-zinc-800";
              return (
                <button
                  key={o}
                  disabled={disabled}
                  onClick={() => choose(o)}
                  className={`rounded-lg border px-3 py-4 text-left text-sm transition ${tone}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {phase === "done" && result && !result.correct && result.funFact && (
            <FunFactBox>{result.funFact}</FunFactBox>
          )}
        </>
      )}
    </div>
  );
}
