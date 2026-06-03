"use client";

import posthog from "posthog-js";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  userInternalId: string;
  date: string;
  shareText: string;
};

export function ShareButton({ userInternalId, date, shareText }: Props) {
  const [busy, setBusy] = useState(false);

  const share = useCallback(async () => {
    setBusy(true);
    try {
      const url = `/api/share-card?userId=${encodeURIComponent(userInternalId)}&date=${encodeURIComponent(date)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Share card unavailable");
      }
      const blob = await res.blob();
      const file = new File([blob], "quanta-share.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "QUANTA", text: shareText });
        posthog.capture("share_card_shared", { platform: "web_share_api" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "quanta-share.png";
        a.click();
        posthog.capture("share_card_shared", { platform: "download" });
      }
    } finally {
      setBusy(false);
    }
  }, [date, shareText, userInternalId]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={share} disabled={busy}>
        Share card
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(shareText);
          posthog.capture("share_card_shared", { platform: "clipboard_text" });
        }}
      >
        Copy text
      </Button>
    </div>
  );
}
