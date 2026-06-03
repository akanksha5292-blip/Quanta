"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  enableOneSignalPush,
  isOneSignalClientConfigured,
  linkOneSignalUser,
} from "@/lib/onesignal-client";
import { isClerkConfigured } from "@/lib/config";

function NotificationOptInInner() {
  const { user, isLoaded } = useUser();
  const [hour, setHour] = useState(9);
  const [msg, setMsg] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"idle" | "loading" | "on" | "off">("idle");
  const pushAvailable = isOneSignalClientConfigured();

  useEffect(() => {
    if (!isLoaded) return;
    void fetch("/api/profile/reminder")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { preferred_reminder_hour?: number } | null) => {
        if (j?.preferred_reminder_hour != null) setHour(j.preferred_reminder_hour);
      })
      .catch(() => undefined);
  }, [isLoaded]);

  const saveHour = async () => {
    setMsg(null);
    const res = await fetch("/api/profile/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_reminder_hour: hour }),
    });
    setMsg(res.ok ? "Reminder hour saved (IST)." : "Sign in to save your reminder hour.");
  };

  const enablePush = async () => {
    if (!user?.id) {
      setMsg("Sign in to enable push reminders.");
      return;
    }
    setPushState("loading");
    setMsg(null);
    await linkOneSignalUser(user.id);
    const result = await enableOneSignalPush();
    if (result === "granted") {
      setPushState("on");
      setMsg("Push enabled. We'll nudge you at your chosen IST hour.");
    } else if (result === "denied") {
      setPushState("off");
      setMsg("Notifications blocked in browser settings.");
    } else {
      setPushState("off");
      setMsg("Push not available — check NEXT_PUBLIC_ONESIGNAL_APP_ID.");
    }
  };

  return (
    <ReminderForm
      hour={hour}
      setHour={setHour}
      msg={msg}
      pushAvailable={pushAvailable}
      pushState={pushState}
      onSaveHour={() => void saveHour()}
      onEnablePush={() => void enablePush()}
    />
  );
}

function ReminderForm({
  hour,
  setHour,
  msg,
  pushAvailable,
  pushState,
  onSaveHour,
  onEnablePush,
}: {
  hour: number;
  setHour: (h: number) => void;
  msg: string | null;
  pushAvailable: boolean;
  pushState: "idle" | "loading" | "on" | "off";
  onSaveHour: () => void;
  onEnablePush: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-white">
      <p className="mb-2 text-sm text-zinc-300">Get reminded when today&apos;s puzzle drops.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-500">IST hour (0–23)</label>
        <input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="w-20 rounded-md border border-zinc-800 bg-black px-2 py-1 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={onSaveHour}>
          Save hour
        </Button>
        {pushAvailable && isClerkConfigured() && (
          <Button type="button" size="sm" disabled={pushState === "loading"} onClick={onEnablePush}>
            {pushState === "on" ? "Push on" : "Enable push"}
          </Button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}

export function NotificationOptIn() {
  if (!isClerkConfigured()) {
    return (
      <ReminderForm
        hour={9}
        setHour={() => undefined}
        msg="Sign in and configure Clerk to save reminder preferences."
        pushAvailable={false}
        pushState="idle"
        onSaveHour={() => undefined}
        onEnablePush={() => undefined}
      />
    );
  }

  return <NotificationOptInInner />;
}
