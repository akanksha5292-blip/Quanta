"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addIstCalendarDays, formatIstDate } from "@/lib/ist";

type Row = {
  user_id: string | null;
  score: number;
  rank_global: number | null;
  rank_percentile: number | null;
  user: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"friends" | "global">("friends");
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState("Today");
  const today = formatIstDate();

  useEffect(() => {
    const load = async (date: string) => {
      const res = await fetch(`/api/leaderboard?type=${tab}&date=${date}`);
      const json = (await res.json()) as { rows: Row[]; meId?: string };
      return { rows: json.rows ?? [], meId: json.meId ?? null };
    };

    void (async () => {
      let { rows: r, meId: id } = await load(today);
      let label = "Today";
      if (r.length === 0 && tab === "global") {
        const yesterday = addIstCalendarDays(-1);
        const y = await load(yesterday);
        r = y.rows;
        id = y.meId;
        label = "Yesterday";
      }
      setRows(r);
      setMeId(id);
      setDateLabel(label);
    })();
  }, [tab, today]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("lb")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_daily", filter: `date=eq.${today}` },
        () => {
          void fetch(`/api/leaderboard?type=${tab}&date=${today}`)
            .then((r) => r.json())
            .then((j: { rows: Row[]; meId?: string }) => {
              setRows(j.rows ?? []);
              if (j.meId) setMeId(j.meId);
              setDateLabel("Today");
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [today, tab]);

  const meRow = rows.find((r) => r.user_id && meId && r.user_id === meId);
  const inviteRef = meId ?? "YOUR_ID";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#07080C] p-6 text-white">
      <h1 className="mb-1 text-2xl font-semibold text-[#F5C842]">Leaderboard</h1>
      <p className="mb-4 text-xs text-zinc-500">{dateLabel}</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "friends" | "global")}>
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {tab === "friends" && rows.length === 0 && (
            <div className="mt-4 rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
              <p className="mb-2">No friends on the board yet.</p>
              <p>
                Invite:{" "}
                <code className="text-[#F5C842]">
                  /join?ref={inviteRef}
                </code>
              </p>
            </div>
          )}
          {rows.length === 0 && tab === "global" && dateLabel === "Today" && (
            <p className="mt-4 text-sm text-zinc-400">Be the first to play today.</p>
          )}
          <div className="mt-4 space-y-2">
            {rows.map((r, idx) => {
              const rank = idx + 1;
              const medal =
                rank === 1
                  ? "border-yellow-500/40 text-yellow-300"
                  : rank === 2
                    ? "border-zinc-400/40 text-zinc-300"
                    : rank === 3
                      ? "border-amber-700/40 text-amber-600"
                      : "";
              const isMe = r.user_id === meId;
              return (
                <div
                  key={`${r.user_id}-${idx}`}
                  className={`flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 ${medal} ${isMe ? "ring-1 ring-[#F5C842]/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm text-zinc-500">#{rank}</span>
                    <span>{r.user?.display_name || r.user?.username || "Player"}</span>
                  </div>
                  <span className="font-mono text-[#F5C842]">{r.score}</span>
                </div>
              );
            })}
          </div>
          {meRow && !rows.slice(0, 10).some((r) => r.user_id === meId) && (
            <div className="sticky bottom-0 mt-4 border-t border-zinc-800 bg-[#07080C] p-3 text-sm text-zinc-300">
              You · #{meRow.rank_global ?? "—"} · Top{" "}
              {Math.max(1, 100 - Math.round(meRow.rank_percentile ?? 0))}% {dateLabel.toLowerCase()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
