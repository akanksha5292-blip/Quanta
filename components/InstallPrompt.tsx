"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "quanta_install_prompt_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt({ showAfterComplete }: { showAfterComplete: boolean }) {
  const [visible, setVisible] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!showAfterComplete) return;
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!Number.isNaN(ts) && Date.now() - ts < 7 * 86400000) return;
    }
    const t = setTimeout(() => setVisible(true), 800);
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [showAfterComplete]);

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    const ev = deferredRef.current;
    if (!ev) {
      dismiss();
      return;
    }
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "accepted") dismiss();
    else setVisible(true);
  };

  if (!visible) return null;

  const canInstall = Boolean(deferredRef.current);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950 p-4 text-white shadow-lg">
      <p className="mb-3 text-sm">
        {canInstall
          ? "Add QUANTA to your home screen for daily reminders."
          : "On iPhone: Share → Add to Home Screen. On Android/desktop: use your browser’s install option."}
      </p>
      <div className="flex gap-2">
        {canInstall && (
          <Button type="button" onClick={() => void install()}>
            Install
          </Button>
        )}
        <Button type="button" variant="outline" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
