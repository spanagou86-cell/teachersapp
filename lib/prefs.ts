"use client";

import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PREFS_KEY } from "./prefs-boot";

/** Per-device display settings. */
export interface Prefs {
  text: "normal" | "large";
}

const DEFAULTS: Prefs = { text: "normal" };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const el = document.documentElement;
  if (p.text === "large") el.dataset.text = "large";
  else delete el.dataset.text;
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  useEffect(() => setPrefs(read()), []);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Private mode: the choice lasts for this visit only.
      }
      apply(next);
      return next;
    });
  }, []);
  return [prefs, update];
}

/**
 * Sheets printed «φιλικά για δυσλεξία» (British Dyslexia Association style guide: plain sans
 * serif, bigger text, wider letter, word and line spacing, left-aligned). A choice per sheet,
 * kept on this device: it changes the print, not the sheet.
 */
export const useDyslexia = create<{ ids: string[]; set: (id: string, on: boolean) => void }>()(
  persist(
    (set) => ({
      ids: [],
      set: (id, on) => set((s) => ({ ids: on ? [...new Set([...s.ids, id])] : s.ids.filter((x) => x !== id) })),
    }),
    { name: "taxi-dyslexia", storage: createJSONStorage(() => localStorage) },
  ),
);
