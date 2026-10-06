"use client";

import { useEffect, useState } from "react";
import { subjectsFor } from "../subjects";
import type { Subject } from "../types";
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

/** The subjects of the teacher's country (Γλώσσα / Ελληνικά…), older ones from the other system last. */
export function useSubjects(): Subject[] {
  return subjectsFor(useApp((s) => s.profile.country));
}
