import { NextResponse } from "next/server";
import { isCronSecretConfigured } from "@/lib/config";

/** Returns an error response when cron auth fails, or null when authorized. */
export function verifyCronRequest(request: Request): NextResponse | null {
  if (!isCronSecretConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET!.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
