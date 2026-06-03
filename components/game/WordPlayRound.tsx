"use client";

import { useState } from "react";
import { Timer } from "@/components/game/Timer";
import { Button } from "@/components/ui/button";

type Props = {
  data: { letters: string[]; slots: number; questionId: string };
  onComplete: (score: number) => void;
};

export function WordPlayRound({ data, onComplete }: Props) {
  const [pool, setPool] = useState(() => data.letters.map((l, i) => ({ l, i })));
  const [slots, setSlots] = useState<string[]>(() => Array(data.slots).fill(""));

  const pick = (idx: number, letter: string) => {
    const pos = slots.findIndex((s) => !s);
    if (pos === -1) return;
    const next = [...slots];
    next[pos] = letter;
    setSlots(next);
    setPool((p) => p.filter((x) => x.i !== idx));
  };

  const removeLast = () => {
    const pos = [...slots].map((s, i) => (s ? i : -1)).filter((i) => i >= 0).pop();
    if (pos === undefined) return;
    const letter = slots[pos];
    if (!letter) return;
    const next = [...slots];
    next[pos] = "";
    setSlots(next);
    const origIdx = data.letters.findIndex((l, i) => l === letter && !pool.some((p) => p.i === i));
    setPool((p) => [...p, { l: letter, i: origIdx }]);
  };

  const reset = () => {
    setPool(data.letters.map((l, i) => ({ l, i })));
    setSlots(Array(data.slots).fill(""));
  };

  const submit = async () => {
    const word = slots.join("");
    const res = await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: data.questionId,
        answer: word,
        timingMs: 60000,
        roundType: "wordplay",
      }),
    });
    const json = (await res.json()) as { score: number };
    onComplete(json.score);
  };

  const filled = slots.every(Boolean);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 text-white">
      <Timer durationSeconds={120} />
      <div className="flex gap-2">
        {slots.map((s, i) => (
          <div key={i} className="flex h-12 w-10 items-center justify-center rounded-md border border-zinc-700 text-lg">
            {s}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((t) => (
          <button
            key={`${t.i}-${t.l}`}
            type="button"
            onClick={() => pick(t.i, t.l)}
            className="rounded-md bg-zinc-800 px-3 py-2 font-mono text-lg"
          >
            {t.l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={removeLast}>
          Remove Last
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          Reset
        </Button>
        <Button type="button" disabled={!filled} onClick={submit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
