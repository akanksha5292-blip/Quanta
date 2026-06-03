"use client";

import { useState } from "react";
import { Timer } from "@/components/game/Timer";

type Q = { questionId: string; prompt: string; options: string[] };

type Props = {
  questions: Q[];
  onComplete: (total: number, scores: number[]) => void;
};

export function GKSparkRound({ questions, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const q = questions[idx]!;

  const advance = async (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q.questionId,
        answer: opt,
        timingMs: 20000,
        roundType: "gk",
      }),
    });
    const json = (await res.json()) as { score: number };
    const nextScores = [...scores, json.score];
    setScores(nextScores);
    setTimeout(
      () => {
        setPicked(null);
        if (idx >= questions.length - 1) {
          setDone(true);
          onComplete(
            nextScores.reduce((a, b) => a + b, 0),
            nextScores,
          );
        } else {
          setIdx(idx + 1);
        }
      },
      paused ? 6000 : 2000,
    );
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-4 text-white">
        <h3 className="text-lg font-semibold">GK Summary</h3>
        {scores.map((s, i) => (
          <div key={i} className="flex justify-between rounded-md border border-zinc-800 px-3 py-2">
            <span>Q{i + 1}</span>
            <span className="text-[#F5C842]">{s}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 text-white">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-[#F5C842] transition-all"
          style={{ width: `${((idx + (picked ? 0.5 : 0)) / questions.length) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          Q{idx + 1}/{questions.length}
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Slower advance
        </label>
      </div>
      <Timer key={q.questionId} durationSeconds={30} />
      <p className="text-lg">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            disabled={Boolean(picked)}
            onClick={() => advance(o)}
            className="rounded-lg border border-zinc-800 px-3 py-3 text-left text-sm hover:border-[#F5C842]"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
