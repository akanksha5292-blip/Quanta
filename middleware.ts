import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isClerkFullyConfigured } from "@/lib/config";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join(.*)",
  "/api/og(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/cron(.*)",
  "/api/dev(.*)",
]);

const clerkMiddlewareHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

function passthroughMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

/** Next.js must receive clerkMiddleware as default export directly — not via a wrapper call. */
export default isClerkFullyConfigured() ? clerkMiddlewareHandler : passthroughMiddleware;

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
