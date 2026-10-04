"use client";

import { useEffect, useState } from "react";
import { useApp } from ".";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useApp.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
