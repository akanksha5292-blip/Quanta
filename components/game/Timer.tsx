"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TimerProps = {
  durationSeconds: number;
  onExpire?: () => void;
  color?: string;
};

export function Timer({ durationSeconds, onExpire, color = "#F5C842" }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const tick = useCallback(
    (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const next = Math.max(0, durationSeconds - elapsed);
      setRemaining(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
        onExpire?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [durationSeconds, onExpire],
  );

  useEffect(() => {
    firedRef.current = false;
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  const ratio = durationSeconds > 0 ? remaining / durationSeconds : 0;
  const ringColor = ratio <= 0.2 ? "#EF4444" : ratio <= 0.5 ? "#F59E0B" : color;
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} stroke="#1f2937" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={ringColor}
          strokeWidth="8"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-sm text-zinc-400">{remaining.toFixed(1)}s</div>
    </div>
  );
}
