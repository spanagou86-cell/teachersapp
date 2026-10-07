import type { Check, LessonSlot, SubjectId } from "./types";

/** Tap to move on: nothing → ✓ → ~ → ✗ → nothing. */
export const nextCheck = (c?: Check): Check | undefined => (c === undefined ? "y" : c === "y" ? "p" : c === "p" ? "n" : undefined);

export const CHECK_LABEL: Record<Check, string> = { y: "κατάλαβε", p: "μερικώς", n: "δυσκολεύτηκε" };

export interface Tally {
  y: number;
  p: number;
  n: number;
}

export const tally = (checks: Record<string, Check> | undefined): Tally => {
  const t = { y: 0, p: 0, n: 0 };
  for (const c of Object.values(checks ?? {})) t[c]++;
  return t;
};

/** One pupil across lessons, per subject: how often understood, partly, struggled. */
export function pupilBySubject(slots: LessonSlot[], studentId: string, from?: string, to?: string): Partial<Record<SubjectId, Tally>> {
  const out: Partial<Record<SubjectId, Tally>> = {};
  for (const s of slots) {
    const c = s.checks?.[studentId];
    if (!c || (from && s.date < from) || (to && s.date > to)) continue;
    const t = (out[s.subjectId] ??= { y: 0, p: 0, n: 0 });
    t[c]++;
  }
  return out;
}

/** The next lesson of the same class and subject: where the follow-up sheet goes. */
export function nextOfSame(slots: LessonSlot[], slot: LessonSlot): LessonSlot | undefined {
  return slots
    .filter((s) => s.classId === slot.classId && s.subjectId === slot.subjectId && !s.carriedToId && (s.date > slot.date || (s.date === slot.date && s.start > slot.start)))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
}
