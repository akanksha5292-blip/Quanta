"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GuesstimatRound } from "@/components/game/GuesstimatRound";
import { WarmupRound } from "@/components/game/WarmupRound";
import { GKSparkRound } from "@/components/game/GKSparkRound";
import { WordPlayRound } from "@/components/game/WordPlayRound";
import { JudgmentRound } from "@/components/game/JudgmentRound";
import { Button } from "@/components/ui/button";
import {
  isPackComplete,
  judgmentOptions,
  packDailySet,
  parseOptions,
  wordplayTiles,
} from "@/lib/game-pack";
import { useGameStore } from "@/stores/gameStore";
import type { DailySetDTO, QuestionDTO } from "@/types";

const ROUND_LABELS: Record<number, string> = {
  0: "Guesstimate",
  1: "Warm-up",
  2: "GK ×3",
  3: "Wordplay",
  4: "Judgment",
};

type LoadState = "loading" | "error" | "ready";

export function GameFlow() {
  const router = useRouter();
  const { pack, roundIndex, setPack, setRoundScore, setGkScores, setNewBadges, nextRound, reset } =
    useGameStore();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg(null);
    reset();
    try {
      const res = await fetch("/api/game/today");
      if (res.status === 401) {
        setErrorMsg("Sign in to play today’s QUANTA.");
        setLoadState("error");
        return;
      }
      if (res.status === 404) {
        const j = (await res.json()) as { message?: string };
        setErrorMsg(
          process.env.NODE_ENV === "development"
            ? "No puzzle for today yet. Go to the homepage and click “Seed today’s game”, then try Play again."
            : (j.message ?? "Game not published yet, check back soon"),
        );
        setLoadState("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg("Could not load today’s game.");
        setLoadState("error");
        return;
      }
      const data = (await res.json()) as DailySetDTO;
      const packed = packDailySet(data.date, data.questions);
      if (!isPackComplete(packed)) {
        setErrorMsg("Today’s set is incomplete. Check back soon.");
        setLoadState("error");
        return;
      }
      setPack(data.date, packed);
      setLoadState("ready");
    } catch {
      setErrorMsg("Network error loading the game.");
      setLoadState("error");
    }
  }, [reset, setPack]);

  useEffect(() => {
    void load();
  }, [load]);

  const finishGame = useCallback(() => {
    router.push("/results");
  }, [router]);

  const handleGuesstimate = (score: number) => {
    setRoundScore("guesstimate", score);
    nextRound();
  };

  const handleWarmup = (score: number) => {
    setRoundScore("warmup", score);
    nextRound();
  };

  const handleGk = (total: number, scores?: number[]) => {
    if (scores?.length) setGkScores(scores);
    else setRoundScore("gk", total);
    nextRound();
  };

  const handleWordplay = (score: number) => {
    setRoundScore("wordplay", score);
    nextRound();
  };

  const handleJudgment = (
    score: number,
    newBadges?: { id: string; name: string; description: string }[],
  ) => {
    setRoundScore("judgment", score);
    if (newBadges?.length) setNewBadges(newBadges);
    finishGame();
  };

  if (loadState === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F5C842] border-t-transparent" />
        <p className="text-sm">Loading today’s puzzle…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-zinc-300">{errorMsg}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!pack) return null;

  const q = (question: QuestionDTO | null) => question!;

  switch (roundIndex) {
    case 0:
      return (
        <RoundShell label={ROUND_LABELS[0]!} step={1} total={5}>
          <GuesstimatRound
            data={{
              question: q(pack.guesstimate).question,
              distMin: Number(q(pack.guesstimate).guesstimate_dist_min ?? 1),
              distMax: Number(q(pack.guesstimate).guesstimate_dist_max ?? 1000),
              unit: q(pack.guesstimate).guesstimate_unit ?? "",
              questionId: q(pack.guesstimate).id,
            }}
            onComplete={handleGuesstimate}
          />
        </RoundShell>
      );
    case 1:
      return (
        <RoundShell label={ROUND_LABELS[1]!} step={2} total={5}>
          <WarmupRound
            data={{
              fact: q(pack.warmup).question,
              options: parseOptions(q(pack.warmup).options),
              questionId: q(pack.warmup).id,
            }}
            onComplete={handleWarmup}
          />
        </RoundShell>
      );
    case 2:
      return (
        <RoundShell label={ROUND_LABELS[2]!} step={3} total={5}>
          <GKSparkRound
            questions={pack.gk.map((g) => ({
              questionId: g.id,
              prompt: g.question,
              options: parseOptions(g.options),
            }))}
            onComplete={handleGk}
          />
        </RoundShell>
      );
    case 3: {
      const tiles = wordplayTiles(q(pack.wordplay));
      return (
        <RoundShell label={ROUND_LABELS[3]!} step={4} total={5}>
          <WordPlayRound
            data={{
              letters: tiles.letters,
              slots: tiles.slots,
              questionId: q(pack.wordplay).id,
            }}
            onComplete={handleWordplay}
          />
        </RoundShell>
      );
    }
    case 4:
      return (
        <RoundShell label={ROUND_LABELS[4]!} step={5} total={5}>
          <JudgmentRound
            data={{
              scenario: q(pack.judgment).question,
              options: judgmentOptions(q(pack.judgment)),
              questionId: q(pack.judgment).id,
            }}
            onComplete={handleJudgment}
          />
        </RoundShell>
      );
    default:
      finishGame();
      return null;
  }
}

function RoundShell({
  label,
  step,
  total,
  children,
}: {
  label: string;
  step: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Round {step}/{total} · {label}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-[#F5C842] transition-all"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
