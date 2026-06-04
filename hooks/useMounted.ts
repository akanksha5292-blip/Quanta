"use client";

import { useEffect, useState } from "react";

/** True only after the component has mounted in the browser (avoids SSR/client auth UI mismatches). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
