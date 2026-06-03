"use client";

import { useEffect, useMemo, useState } from "react";
import { ScoreCard } from "@/components/game/ScoreCard";
import { ShareButton } from "@/components/ShareButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { BadgeCelebration } from "@/components/layout/BadgeCelebration";
import { useGameStore } from "@/stores/gameStore";
import { formatIstDate } from "@/lib/ist";

export function ResultsView({ userInternalId }: { userInternalId: string }) {
  const { roundScores, totalScore, date } = useGameStore();
  const today = date ?? formatIstDate();
  const total = totalScore();
  const [topPercent, setTopPercent] = useState<number | null>(null);

  useEffect(() => {
    void fetch("/api/me/summary")
      .then((r) => r.json())
      .then((j: { topPercent?: number | null }) => {
        if (j.topPercent != null) setTopPercent(j.topPercent);
      });
  }, []);

  const rounds = useMemo(
    () => [
      { label: "Guesstimate ◎", score: roundScores.guesstimate ?? 0 },
      { label: "Warm-up ✦", score: roundScores.warmup ?? 0 },
      { label: "GK ⚡", score: roundScores.gk?.reduce((a, b) => a + b, 0) ?? 0 },
      { label: "Wordplay ≋", score: roundScores.wordplay ?? 0 },
      { label: "Judgment ⊕", score: roundScores.judgment ?? 0 },
    ],
    [roundScores],
  );

  const shareText = [
    `QUANTA ${today}`,
    `${total}/500`,
    rounds.map((r) => (r.score >= 80 ? "🟨" : r.score >= 40 ? "🟧" : "⬛")).join(""),
  ].join("\n");

  if (total === 0 && !roundScores.guesstimate) {
    return (
      <div className="py-12 text-center text-zinc-400">
        <p>No scores yet. Finish a game from Play first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8">
      <BadgeCelebration userInternalId={userInternalId} date={today} />
      <ScoreCard
        total={total}
        rounds={rounds}
        percentileTop={topPercent ?? 50}
        shareText={shareText}
      />
      {userInternalId && (
        <ShareButton userInternalId={userInternalId} date={today} shareText={shareText} />
      )}
      <NotificationOptIn />
      <InstallPrompt showAfterComplete />
    </div>
  );
}
