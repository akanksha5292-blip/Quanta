import { isOneSignalConfigured } from "@/lib/config";

export type OneSignalPushPayload = {
  clerkId: string;
  heading: string;
  body: string;
};

/** Server-side push via OneSignal REST (external user id = Clerk id). */
export async function sendOneSignalPush(payload: OneSignalPushPayload): Promise<boolean> {
  if (!isOneSignalConfigured()) return false;

  const appId = process.env.ONESIGNAL_APP_ID!.trim();
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.ONESIGNAL_API_KEY!.trim()}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [payload.clerkId],
      headings: { en: payload.heading },
      contents: { en: payload.body },
    }),
  });

  return res.ok;
}
