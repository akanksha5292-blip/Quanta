"use client";

import { motion } from "framer-motion";

export function StreakBadge({ days }: { days: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-orange-400">
      <span>🔥</span>
      <span className="font-semibold">{days}</span>
      {days > 7 && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-xs"
        >
          streak
        </motion.span>
      )}
    </div>
  );
}
