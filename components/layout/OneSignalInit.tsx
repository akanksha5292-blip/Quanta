"use client";

import { useEffect } from "react";
import { isOneSignalClientConfigured } from "@/lib/onesignal-client";

export function OneSignalInit() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
    if (!appId || typeof window === "undefined" || !isOneSignalClientConfigured()) return;

    if (document.querySelector('script[data-quanta-onesignal]')) return;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.dataset.quantaOnesignal = "1";
    document.head.appendChild(script);

    script.onload = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OneSignal: {
        init: (o: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>;
      }) {
        await OneSignal.init({ appId, allowLocalhostAsSecureOrigin: true });
      });
    };
  }, []);

  return null;
}
