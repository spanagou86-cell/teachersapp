import { DEMO_TODAY, timeToMin } from "./dates";
import type { HHMM, ISODate, LessonSlot } from "./types";

/** School day periods (Greek primary timetable used in the mockups). */
export const PERIODS: { start: HHMM; end: HHMM }[] = [
  { start: "08:00", end: "08:40" },
  { start: "08:40", end: "09:20" },
  { start: "09:20", end: "10:00" },
  { start: "10:20", end: "11:00" },
  { start: "11:00", end: "11:40" },
  { start: "11:40", end: "12:20" },
];

export interface TimeWindow {
  date: ISODate;
  start: HHMM;
  end: HHMM;
}

export function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  if (a.date !== b.date) return false;
  return timeToMin(a.start) < timeToMin(b.end) && timeToMin(b.start) < timeToMin(a.end);
}

export function sortSlots(slots: LessonSlot[]): LessonSlot[] {
  return [...slots].sort((a, b) => (a.date === b.date ? timeToMin(a.start) - timeToMin(b.start) : a.date < b.date ? -1 : 1));
}

export function slotsOn(slots: LessonSlot[], date: ISODate): LessonSlot[] {
  return sortSlots(slots.filter((s) => s.date === date));
}

/** Lessons of the teacher that overlap the target window. A teacher can't be in two rooms at once. */
export function findConflicts(slots: LessonSlot[], target: TimeWindow, ignoreId?: string): LessonSlot[] {
  return slots.filter((s) => s.id !== ignoreId && overlaps(s, target));
}

/** Free periods on a date (no overlapping lesson). */
export function freePeriods(slots: LessonSlot[], date: ISODate): { start: HHMM; end: HHMM }[] {
  return PERIODS.filter((p) => findConflicts(slots, { date, ...p }).length === 0);
}

export function nextLesson(slots: LessonSlot[], date: ISODate, now: HHMM): LessonSlot | undefined {
  return slotsOn(slots, date).find((s) => timeToMin(s.end) > timeToMin(now));
}

export type CarryOverResult =
  | { ok: true; slots: LessonSlot[]; newSlot: LessonSlot }
  | { ok: false; reason: "conflict"; conflicts: LessonSlot[] }
  | { ok: false; reason: "past" | "not-found" | "already-carried" };

/**
 * Moves the unfinished part of a lesson to a new time. The original stays in the
 * history (with its status and note); a new planned lesson links back to it.
 */
export function carryOverLesson(
  slots: LessonSlot[],
  slotId: string,
  target: TimeWindow,
  newId: string,
  today: ISODate = DEMO_TODAY,
): CarryOverResult {
  const original = slots.find((s) => s.id === slotId);
  if (!original) return { ok: false, reason: "not-found" };
  if (original.carriedToId) return { ok: false, reason: "already-carried" };
  if (target.date < today) return { ok: false, reason: "past" };
  const conflicts = findConflicts(slots, target, slotId);
  if (conflicts.length) return { ok: false, reason: "conflict", conflicts };

  const newSlot: LessonSlot = {
    id: newId,
    date: target.date,
    start: target.start,
    end: target.end,
    classId: original.classId,
    subjectId: original.subjectId,
    topic: original.topic,
    materialIds: [...original.materialIds],
    status: "planned",
    taughtNote: "",
    carriedFromId: original.id,
  };
  const status = original.status === "planned" || original.status === "done" ? "partial" : original.status;
  return {
    ok: true,
    newSlot,
    slots: sortSlots([...slots.map((s) => (s.id === slotId ? { ...s, status, carriedToId: newId } : s)), newSlot]),
  };
}

/** Undo a carry-over: drop the new lesson and unlink the original. */
export function undoCarryOver(slots: LessonSlot[], newSlotId: string): LessonSlot[] {
  const moved = slots.find((s) => s.id === newSlotId);
  if (!moved?.carriedFromId) return slots;
  return slots
    .filter((s) => s.id !== newSlotId)
    .map((s) => (s.id === moved.carriedFromId ? { ...s, carriedToId: undefined } : s));
}
