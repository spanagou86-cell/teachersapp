"use client";

import { useCallback, useEffect, useState } from "react";
import { PREFS_KEY } from "./prefs-boot";

/** Per-device display settings. "Συσκευής" follows the phone or computer, which may be dark. */
export interface Prefs {
  theme: "light" | "system";
  text: "normal" | "large";
}

const DEFAULTS: Prefs = { theme: "system", text: "normal" };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const el = document.documentElement;
  if (p.theme === "light") el.dataset.theme = "light";
  else delete el.dataset.theme;
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
