import { addDays, shortDate, startOfWeek, timeToMin } from "./dates";
import { yearFor, type Country, type Range } from "./schoolYear";
import type { HHMM, ISODate, LessonSlot } from "./types";

/** Ημερολόγιο ύλης (what was taught) and Εβδομαδιαίος προγραμματισμός (what will be). */

export type PeriodKind = "week" | "month" | "term" | "year";

export interface Period {
  from: ISODate;
  to: ISODate;
  label: string;
}

const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];

const lastOfMonth = (y: number, m: number): ISODate => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

/** The week, month, term or school year that contains `anchor`. */
export function periodFor(kind: PeriodKind, anchor: ISODate, country: Country): Period {
  const year = yearFor(country, anchor);
  if (kind === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 4);
    return { from, to, label: `${shortDate(from)} – ${shortDate(to)}` };
  }
  if (kind === "month") {
    const [y, m] = anchor.split("-").map(Number);
    return { from: `${anchor.slice(0, 7)}-01`, to: lastOfMonth(y, m), label: `${MONTHS[m - 1]} ${y}` };
  }
  if (kind === "term") {
    const term = year.terms.find((t) => anchor >= t.from && anchor <= t.to) ?? year.terms.find((t) => anchor < t.from) ?? year.terms.at(-1)!;
    return { from: term.from, to: term.to, label: term.label };
  }
  return { from: year.start, to: year.end, label: `Σχολικό έτος ${year.start.slice(0, 4)}–${year.end.slice(0, 4)}` };
}

/** Moves a period one step back (-1) or forward (+1). */
export function shiftPeriod(kind: PeriodKind, anchor: ISODate, dir: -1 | 1, country: Country): ISODate {
  const p = periodFor(kind, anchor, country);
  if (kind === "week") return addDays(p.from, 7 * dir);
  if (kind === "month") {
    const [y, m] = anchor.split("-").map(Number);
    const n = m + dir;
    return n < 1 ? `${y - 1}-12-01` : n > 12 ? `${y + 1}-01-01` : `${y}-${String(n).padStart(2, "0")}-01`;
  }
  return dir < 0 ? addDays(p.from, -1) : addDays(p.to, 1);
}

export interface JournalLesson {
  type: "lesson";
  slot: LessonSlot;
  /** Remark for the "Παρατηρήσεις" column. */
  remark: string;
  /** Finished but nothing recorded yet. */
  missing: boolean;
}
export interface JournalBreak {
  type: "break";
  date: ISODate;
  label: string;
}
export type JournalRow = JournalLesson | JournalBreak;

export interface JournalMonth {
  key: string;
  label: string;
  rows: JournalRow[];
}

function remarkFor(s: LessonSlot, byId: Map<string, LessonSlot>): string {
  const to = s.carriedToId ? byId.get(s.carriedToId) : undefined;
  const from = s.carriedFromId ? byId.get(s.carriedFromId) : undefined;
  const parts: string[] = [];
  if (s.status === "partial") parts.push("Μερικώς");
  if (s.status === "skipped") parts.push("Δεν έγινε");
  if (to) parts.push(`συνέχεια ${shortDate(to.date)}`);
  if (from) parts.push(`συνέχεια από ${shortDate(from.date)}`);
  return parts.join(" · ");
}

/** Has the lesson ended (by `today`/`now`)? */
const ended = (s: LessonSlot, today: ISODate, now: HHMM) => s.date < today || (s.date === today && timeToMin(s.end) <= timeToMin(now));

/**
 * Rows of the Ημερολόγιο ύλης: lessons that have taken place, with holidays and breaks
 * as single rows, grouped by month (one printed page per month).
 */
export function journal({
  slots,
  period,
  classId,
  subjectId,
  holidays,
  today,
  now,
}: {
  slots: LessonSlot[];
  period: Period;
  classId?: string;
  subjectId?: string;
  holidays: Range[];
  today: ISODate;
  now: HHMM;
}): { months: JournalMonth[]; missing: LessonSlot[]; total: number } {
  const byId = new Map(slots.map((s) => [s.id, s]));
  const until = period.to < today ? period.to : today;
  const lessons = slots
    .filter((s) => s.date >= period.from && s.date <= until && ended(s, today, now))
    .filter((s) => (!classId || s.classId === classId) && (!subjectId || s.subjectId === subjectId))
    .sort((a, b) => (a.date === b.date ? timeToMin(a.start) - timeToMin(b.start) : a.date < b.date ? -1 : 1));

  const rows: JournalRow[] = lessons.map((s) => ({
    type: "lesson",
    slot: s,
    remark: remarkFor(s, byId),
    missing: s.status === "planned" || (s.status !== "skipped" && !s.taughtNote.trim() && !s.topic.trim()),
  }));
  for (const h of holidays) {
    if (h.to < period.from || h.from > until) continue;
    const label = h.from === h.to ? h.label : `${h.label} (${shortDate(h.from)} – ${shortDate(h.to)})`;
    rows.push({ type: "break", date: h.from < period.from ? period.from : h.from, label });
  }
  rows.sort((a, b) => {
    const da = a.type === "lesson" ? a.slot.date : a.date;
    const db = b.type === "lesson" ? b.slot.date : b.date;
    if (da !== db) return da < db ? -1 : 1;
    if (a.type !== b.type) return a.type === "break" ? -1 : 1;
    return a.type === "lesson" && b.type === "lesson" ? timeToMin(a.slot.start) - timeToMin(b.slot.start) : 0;
  });

  const months: JournalMonth[] = [];
  for (const r of rows) {
    const d = r.type === "lesson" ? r.slot.date : r.date;
    const key = d.slice(0, 7);
    let m = months.at(-1);
    if (!m || m.key !== key) {
      const [y, mo] = key.split("-").map(Number);
      m = { key, label: `${MONTHS[mo - 1]} ${y}`, rows: [] };
      months.push(m);
    }
    m.rows.push(r);
  }
  return { months, missing: lessons.filter((s) => rows.some((r) => r.type === "lesson" && r.slot.id === s.id && r.missing)), total: lessons.length };
}

/** The Εβδομαδιαίος προγραμματισμός: every lesson of the week, by day, and which still lack a topic. */
export function weekPlan({
  slots,
  monday,
  classId,
  subjectId,
}: {
  slots: LessonSlot[];
  monday: ISODate;
  classId?: string;
  subjectId?: string;
}): { days: { date: ISODate; lessons: LessonSlot[] }[]; noTopic: LessonSlot[] } {
  const days = [0, 1, 2, 3, 4].map((i) => {
    const date = addDays(monday, i);
    const lessons = slots
      .filter((s) => s.date === date && (!classId || s.classId === classId) && (!subjectId || s.subjectId === subjectId) && !s.carriedToId)
      .sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
    return { date, lessons };
  });
  return { days, noTopic: days.flatMap((d) => d.lessons).filter((s) => !s.topic.trim()) };
}
