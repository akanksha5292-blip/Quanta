"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

type Badge = { id: string; name: string; description: string };

export function BadgeCelebration({
  userInternalId,
  date,
}: {
  userInternalId: string;
  date: string;
}) {
  const storeBadges = useGameStore((s) => s.newBadges);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (storeBadges.length) {
      setBadges(storeBadges);
      return;
    }
    if (!userInternalId) return;
    void (async () => {
      const res = await fetch("/api/badges/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userInternalId, date }),
      });
      if (!res.ok) return;
      const j = (await res.json()) as { newBadges?: Badge[] };
      if (j.newBadges?.length) setBadges(j.newBadges);
    })();
  }, [userInternalId, date, storeBadges]);

  useEffect(() => {
    if (!badges.length) return;
    const t = setTimeout(() => setBadges([]), 4000);
    return () => clearTimeout(t);
  }, [badges]);

  return (
    <AnimatePresence>
      {badges.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="rounded-lg border border-[#F5C842]/40 bg-zinc-900 p-4"
        >
          <p className="text-sm font-medium text-[#F5C842]">Badge unlocked · {b.name}</p>
          <p className="text-xs text-zinc-400">{b.description}</p>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
