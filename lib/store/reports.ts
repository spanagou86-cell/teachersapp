"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { reportKey, type ProgressReport, type Rating, type ReportTexts, type Term } from "../sep";
import { useApp } from "./index";
import { fetchReports, saveReport } from "./remote";

/**
 * Progress reports (ΣΕΠ), kept on the device first and saved to the account in the background,
 * so a report is never lost to a bad connection in the middle of January.
 */
interface ReportsState {
  /** Whose reports these are: an account id, or "demo". */
  owner?: string;
  reports: Record<string, ProgressReport>;
  /** Changed here, not yet saved to the account. */
  dirty: string[];
  /** False when the account can't keep reports yet (database not updated). */
  saved?: boolean;
  rate: (studentId: string, year: number, term: Term, id: string, rating?: Rating) => void;
  /** «Όλη η τάξη ★★★»: fills only what is still empty; returns an undo. */
  fill: (studentIds: string[], year: number, term: Term, ids: string[], rating: Rating) => { count: number; undo: () => void };
  setTexts: (studentId: string, year: number, term: Term, patch: Partial<ReportTexts>, reviewed?: boolean) => void;
  setReviewed: (studentId: string, year: number, term: Term, reviewed: boolean) => void;
}

const blank = (studentId: string, year: number, term: Term): ProgressReport => ({ studentId, year, term, ratings: {}, texts: {}, reviewed: false, updatedAt: 0 });

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(flush, 800);
}

async function flush() {
  if (useApp.getState().mode !== "cloud") return;
  const { dirty, reports } = useReports.getState();
  if (!dirty.length) return;
  const done: string[] = [];
  let ok = true;
  for (const key of dirty) {
    const r = reports[key];
    if (!r) done.push(key);
    else if (await saveReport(r)) done.push(key);
    else {
      ok = false;
      break;
    }
  }
  useReports.setState((s) => ({ dirty: s.dirty.filter((k) => !done.includes(k)), saved: ok }));
}

export const useReports = create<ReportsState>()(
  persist(
    (set, get) => {
      const change = (studentId: string, year: number, term: Term, fn: (r: ProgressReport) => ProgressReport) => {
        const key = reportKey(studentId, year, term);
        set((s) => ({
          reports: { ...s.reports, [key]: { ...fn(s.reports[key] ?? blank(studentId, year, term)), updatedAt: Date.now() } },
          dirty: s.dirty.includes(key) ? s.dirty : [...s.dirty, key],
        }));
        scheduleSave();
      };
      return {
        reports: {},
        dirty: [],
        rate: (studentId, year, term, id, rating) =>
          change(studentId, year, term, (r) => {
            const ratings = { ...r.ratings };
            if (rating) ratings[id] = rating;
            else delete ratings[id];
            return { ...r, ratings };
          }),
        fill: (studentIds, year, term, ids, rating) => {
          const before = new Map<string, ProgressReport | undefined>();
          let count = 0;
          for (const sid of studentIds) {
            const key = reportKey(sid, year, term);
            const cur = get().reports[key];
            const missing = ids.filter((id) => !cur?.ratings[id]);
            if (!missing.length) continue;
            before.set(sid, cur);
            count += missing.length;
            change(sid, year, term, (r) => ({ ...r, ratings: { ...Object.fromEntries(missing.map((id) => [id, rating])), ...r.ratings } }));
          }
          return {
            count,
            undo: () => {
              for (const [sid, prev] of before) change(sid, year, term, (r) => ({ ...r, ratings: prev?.ratings ?? {} }));
            },
          };
        },
        setTexts: (studentId, year, term, patch, reviewed) =>
          change(studentId, year, term, (r) => ({ ...r, texts: { ...r.texts, ...patch }, reviewed: reviewed ?? r.reviewed })),
        setReviewed: (studentId, year, term, reviewed) =>
          change(studentId, year, term, (r) => ({ ...r, reviewed, texts: reviewed ? { ...r.texts, draft: false } : r.texts })),
      };
    },
    {
      name: "taxi-reports",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ owner: s.owner, reports: s.reports, dirty: s.dirty }),
    },
  ),
);

/** Follows the signed-in teacher: a different account (or signing out) never sees someone else's reports. */
async function follow(signedOut: boolean) {
  const { mode, userId } = useApp.getState();
  // Signing out leaves nothing about the children on this device.
  if (signedOut) return useReports.setState({ owner: undefined, reports: {}, dirty: [], saved: undefined });
  const owner = mode === "cloud" ? userId : mode === "demo" ? "demo" : undefined;
  // Still loading: keep what is here.
  if (!owner) return;
  if (useReports.getState().owner !== owner) useReports.setState({ owner, reports: {}, dirty: [], saved: undefined });
  if (mode !== "cloud") return;
  const remote = await fetchReports();
  if (useReports.getState().owner !== owner) return;
  if (!remote) return useReports.setState({ saved: false });
  useReports.setState((s) => {
    const reports = { ...s.reports };
    for (const r of remote) {
      const key = reportKey(r.studentId, r.year, r.term);
      if (!reports[key] || reports[key].updatedAt < r.updatedAt) reports[key] = r;
    }
    return { reports, saved: true };
  });
  void flush();
}

if (typeof window !== "undefined") {
  let last: string | undefined;
  const check = () => {
    if (!useReports.persist.hasHydrated() || !useApp.persist.hasHydrated()) return;
    const { mode, userId } = useApp.getState();
    const now = `${mode}|${userId ?? ""}`;
    if (now === last) return;
    const signedOut = !mode && !!last && !last.startsWith("null|");
    last = now;
    void follow(signedOut);
  };
  useReports.persist.onFinishHydration(check);
  useApp.persist.onFinishHydration(check);
  useApp.subscribe(check);
  check();
  window.addEventListener("online", () => void flush());
}
