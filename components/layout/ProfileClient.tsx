"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StreakBadge } from "@/components/game/StreakBadge";
import { BADGE_DEFINITIONS, type BadgeId } from "@/lib/badges";
import { addIstCalendarDays, formatIstDate } from "@/lib/ist";

type Pending = { id: string; requester: { id: string; username: string | null; display_name: string | null } | null };

export function ProfileClient({
  user,
  pending,
  earnedBadgeIds,
  playedDates,
  strength,
}: {
  user: {
    imageUrl: string;
    firstName: string | null;
    username: string;
    displayName: string;
    streak: number;
    id: string;
  };
  pending: Pending[];
  earnedBadgeIds: string[];
  playedDates: string[];
  strength: Record<string, number>;
}) {
  const [name, setName] = useState(user.displayName || user.firstName || "");
  const [uname, setUname] = useState(user.username);
  const [msg, setMsg] = useState<string | null>(null);

  const playedSet = useMemo(() => new Set(playedDates), [playedDates]);

  const grid = useMemo(() => {
    const today = formatIstDate();
    return Array.from({ length: 90 }, (_, i) => {
      const label = addIstCalendarDays(i - 89);
      return { label, played: playedSet.has(label), future: label > today };
    });
  }, [playedSet]);

  const save = async () => {
    setMsg(null);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name }),
    });
    if (!res.ok) setMsg("Could not save display name");
    else setMsg("Saved");
  };

  const saveUsername = async () => {
    const check = await fetch(`/api/profile/username?username=${encodeURIComponent(uname)}`);
    const { available } = (await check.json()) as { available: boolean };
    if (!available) {
      setMsg("Username taken");
      return;
    }
    const res = await fetch("/api/profile/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname }),
    });
    setMsg(res.ok ? "Username saved" : "Could not save username");
  };

  const respond = async (friendshipId: string, status: "accepted" | "declined") => {
    await fetch("/api/profile/friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, status }),
    });
    window.location.reload();
  };

  const maxStrength = Math.max(...Object.values(strength), 1);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <Image src={user.imageUrl} alt="" width={64} height={64} className="rounded-full border border-zinc-700" />
        <div className="flex-1">
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input value={uname} onChange={(e) => setUname(e.target.value)} placeholder="username" />
            <Button type="button" variant="outline" size="sm" onClick={saveUsername}>
              Save username
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
            <Button type="button" onClick={save}>
              Save
            </Button>
          </div>
          {msg && <p className="mt-1 text-xs text-zinc-400">{msg}</p>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Streak</p>
        {user.streak > 7 ? (
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            <StreakBadge days={user.streak} />
          </motion.div>
        ) : (
          <StreakBadge days={user.streak} />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Last 90 days (IST)</p>
        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
          {grid.map((c) => (
            <div
              key={c.label}
              title={c.label}
              className={`h-3 rounded-sm ${
                c.played ? "bg-emerald-600" : c.future ? "bg-zinc-900" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Round strength (avg)</p>
        <div className="space-y-2">
          {(["guesstimate", "warmup", "gk", "wordplay", "judgment"] as const).map((r) => (
            <div key={r}>
              <div className="mb-1 flex justify-between text-xs capitalize text-zinc-500">
                <span>{r}</span>
                <span>{strength[r] ?? 0}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#F5C842]"
                  style={{ width: `${((strength[r] ?? 0) / maxStrength) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Badges</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BADGE_DEFINITIONS) as BadgeId[]).map((id) => {
            const earned = earnedBadgeIds.includes(id);
            return (
              <div
                key={id}
                className={`rounded-md border px-2 py-1 text-xs ${
                  earned ? "border-[#F5C842] text-[#F5C842]" : "border-zinc-800 text-zinc-500 opacity-60"
                }`}
              >
                {BADGE_DEFINITIONS[id].name}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-400">Friend requests</p>
        {pending.length === 0 && <p className="text-sm text-zinc-500">No pending requests.</p>}
        {pending.map((p) => (
          <div key={p.id} className="mb-2 flex items-center justify-between rounded-md border border-zinc-800 p-3">
            <span>{p.requester?.display_name || p.requester?.username || "Player"}</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => respond(p.id, "accepted")}>
                Accept
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => respond(p.id, "declined")}>
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
