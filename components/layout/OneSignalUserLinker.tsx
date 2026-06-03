"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { isOneSignalClientConfigured, linkOneSignalUser } from "@/lib/onesignal-client";
import { isClerkConfigured } from "@/lib/config";

export function OneSignalUserLinker() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isClerkConfigured() || !isOneSignalClientConfigured() || !isLoaded || !user?.id) return;
    void linkOneSignalUser(user.id);
  }, [isLoaded, user?.id]);

  return null;
}
