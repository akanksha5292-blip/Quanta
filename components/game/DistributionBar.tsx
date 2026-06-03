"use client";

type Bar = { label: string; value: number; max: number };

export function DistributionBar({ bars }: { bars: Bar[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-zinc-800"
            style={{ height: `${(b.value / max) * 100}%`, minHeight: 4 }}
          />
          <span className="text-[10px] text-zinc-500">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
