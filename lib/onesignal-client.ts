"use client";

type OneSignalSDK = {
  init: (opts: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: {
    requestPermission: () => Promise<void>;
    permission: boolean;
  };
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      optedIn: boolean;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSDK) => void | Promise<void>>;
    __quantaOneSignalReady?: Promise<OneSignalSDK | null>;
  }
}

export function isOneSignalClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim());
}

export function whenOneSignalReady(): Promise<OneSignalSDK | null> {
  if (typeof window === "undefined" || !isOneSignalClientConfigured()) {
    return Promise.resolve(null);
  }
  if (window.__quantaOneSignalReady) return window.__quantaOneSignalReady;

  window.__quantaOneSignalReady = new Promise<OneSignalSDK | null>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      resolve(OneSignal);
    });
    const t = setTimeout(() => resolve(null), 15000);
    void window.__quantaOneSignalReady!.then(() => clearTimeout(t));
  });

  return window.__quantaOneSignalReady;
}

export async function linkOneSignalUser(clerkId: string): Promise<boolean> {
  const os = await whenOneSignalReady();
  if (!os) return false;
  await os.login(clerkId);
  return true;
}

export async function enableOneSignalPush(): Promise<"granted" | "denied" | "unsupported"> {
  const os = await whenOneSignalReady();
  if (!os) return "unsupported";
  await os.Notifications.requestPermission();
  if (!os.Notifications.permission) return "denied";
  await os.User.PushSubscription.optIn();
  return os.User.PushSubscription.optedIn ? "granted" : "denied";
}
