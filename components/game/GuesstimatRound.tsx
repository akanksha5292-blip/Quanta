"use client";

import { useMemo, useState } from "react";
import { Timer } from "@/components/game/Timer";
import { DistributionBar } from "@/components/game/DistributionBar";
import { FunFactBox } from "@/components/game/FunFactBox";
import { Button } from "@/components/ui/button";

type Props = {
  data: {
    question: string;
    hint?: string;
    distMin: number;
    distMax: number;
    unit: string;
    questionId: string;
  };
  onComplete: (score: number) => void;
};

function logMap(v: number, min: number, max: number) {
  const lo = Math.log(Math.max(min, 1));
  const hi = Math.log(Math.max(max, 1));
  const t = v / 100;
  return Math.round(Math.exp(lo + t * (hi - lo)));
}

export function GuesstimatRound({ data, onComplete }: Props) {
  const [slider, setSlider] = useState(50);
  const [input, setInput] = useState(() => logMap(50, data.distMin, data.distMax));
  const [phase, setPhase] = useState<"play" | "done">("play");
  const [result, setResult] = useState<{ correct: number; score: number; funFact?: string | null } | null>(
    null,
  );

  const syncFromSlider = (v: number) => {
    setSlider(v);
    setInput(logMap(v, data.distMin, data.distMax));
  };

  const syncFromInput = (n: number) => {
    setInput(n);
    const lo = Math.log(Math.max(data.distMin, 1));
    const hi = Math.log(Math.max(data.distMax, 1));
    const ln = Math.log(Math.max(n, 1));
    const t = (ln - lo) / (hi - lo || 1);
    setSlider(Math.min(100, Math.max(0, t * 100)));
  };

  const bars = useMemo(() => {
    const steps = 5;
    const span = (data.distMax - data.distMin) / steps || 1;
    return Array.from({ length: steps }, (_, i) => ({
      label: `${Math.round(data.distMin + i * span)}`,
      value: Math.max(1, Math.round(30 - Math.abs(i - 2) * 8)),
      max: 100,
    }));
  }, [data.distMax, data.distMin]);

  const submit = async () => {
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: data.questionId,
        answer: input,
        timingMs: 0,
        roundType: "guesstimate",
      }),
    });
    const json = (await res.json()) as { score: number; correctAnswer: number };
    setResult({ correct: Number(json.correctAnswer), score: json.score, funFact: null });
    setPhase("done");
    onComplete(json.score);
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 text-white">
      <Timer durationSeconds={120} onExpire={phase === "play" ? submit : undefined} />
      <h2 className="text-xl font-semibold">{data.question}</h2>
      {data.hint && <p className="text-sm text-zinc-400">{data.hint}</p>}
      {phase === "play" && (
        <>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => syncFromSlider(Number(e.target.value))}
            className="w-full accent-[#F5C842]"
          />
          <label className="text-sm text-zinc-400">Estimate ({data.unit})</label>
          <input
            type="number"
            value={input}
            onChange={(e) => syncFromInput(Number(e.target.value))}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
          />
          <Button onClick={submit}>Lock in</Button>
        </>
      )}
      {phase === "done" && result && (
        <div className="space-y-4">
          <p>
            Your answer: <span className="text-blue-400">{input}</span> {data.unit} — Correct:{" "}
            <span className="text-[#F5C842]">{result.correct}</span> — Score {result.score}
          </p>
          <DistributionBar bars={bars} />
          {result.funFact && <FunFactBox>{result.funFact}</FunFactBox>}
        </div>
      )}
    </div>
  );
}
