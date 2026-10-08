import { dutyLabel, type Country } from "./schoolYear";
import { addDays, timeToMin, weekday } from "./dates";
import { PERIODS } from "./schedule";
import type { HHMM, ISODate, TimetableEntry } from "./types";

export interface Period {
  start: HHMM;
  end: HHMM;
}

export const KIND_LABEL: Record<TimetableEntry["kind"], string> = {
  lesson: "Μάθημα",
  duty: "Παιδονομία",
  free: "Κενό",
  meeting: "Σύσκεψη",
};

/** Same as KIND_LABEL, with the duty wording of the teacher's country. */
export const kindLabel = (kind: TimetableEntry["kind"], country: Country) => (kind === "duty" ? dutyLabel(country) : KIND_LABEL[kind]);

/** The school day of each system, breaks included so yard duty has a row. */
export const BELLS: Record<Country, readonly Period[]> = {
  gr: [
    { start: "08:15", end: "09:00" },
    { start: "09:00", end: "09:45" },
    { start: "09:45", end: "10:05" },
    { start: "10:05", end: "10:50" },
    { start: "10:50", end: "11:35" },
    { start: "11:35", end: "11:50" },
    { start: "11:50", end: "12:35" },
    { start: "12:35", end: "13:15" },
  ],
  // One bell for every public primary school in Cyprus: seven 40′ periods and three breaks.
  cy: [
    { start: "07:45", end: "08:25" },
    { start: "08:25", end: "09:05" },
    { start: "09:05", end: "09:25" },
    { start: "09:25", end: "10:05" },
    { start: "10:05", end: "10:45" },
    { start: "10:45", end: "10:55" },
    { start: "10:55", end: "11:35" },
    { start: "11:35", end: "12:15" },
    { start: "12:15", end: "12:25" },
    { start: "12:25", end: "13:05" },
  ],
};

/** Length of a teaching period in each system, in minutes. */
export const PERIOD_MINUTES: Record<Country, number> = { gr: 45, cy: 40 };

/** The teaching periods of a bell (breaks are the short rows). */
export const teachingPeriods = (country: Country): Period[] => BELLS[country].filter((p) => timeToMin(p.end) - timeToMin(p.start) >= 30);

/** A break is a short row of the bell (under 30′). */
export const isBreak = (p: Period) => timeToMin(p.end) - timeToMin(p.start) < 30;

/** The bell rows nothing of the day covers: empty periods and breaks, so a day reads from the first bell to the last. */
export function bellGaps(bell: readonly Period[], used: readonly Period[]): Period[] {
  const overlaps = (a: Period, b: Period) => timeToMin(a.start) < timeToMin(b.end) && timeToMin(b.start) < timeToMin(a.end);
  return bell.filter((p) => !used.some((u) => overlaps(p, u)));
}

/** «3η» for the third teaching period of the bell, nothing for a break or a time off the bell. */
export function periodOrdinal(bell: readonly Period[], start: string): string | undefined {
  const i = bell.filter((p) => !isBreak(p)).findIndex((p) => p.start === start);
  return i >= 0 ? `${i + 1}η` : undefined;
}

/** Rows of the weekly grid: every distinct time window in the template, or the default school day. */
export function periodsFrom(entries: TimetableEntry[], country?: Country): Period[] {
  if (!entries.length) return country ? teachingPeriods(country) : PERIODS;
  const map = new Map<string, Period>();
  for (const e of entries) map.set(`${e.start}-${e.end}`, { start: e.start, end: e.end });
  return [...map.values()].sort((a, b) => timeToMin(a.start) - timeToMin(b.start) || timeToMin(a.end) - timeToMin(b.end));
}

/** Last day of the school year that contains `today` (30 June). */
export function schoolYearEnd(today: ISODate): ISODate {
  const [y, m] = today.split("-").map(Number);
  return `${m >= 7 ? y + 1 : y}-06-30`;
}

export interface Occurrence {
  templateId: string;
  date: ISODate;
  entry: TimetableEntry;
}

/** Every weekday occurrence of the template between `from` and `to`, skipping ones that already exist. */
export function materialize(
  entries: TimetableEntry[],
  from: ISODate,
  to: ISODate,
  existing: Set<string> = new Set(),
  /** Days with no school (holidays). */
  skip: (date: ISODate) => boolean = () => false,
): Occurrence[] {
  const byDay = new Map<number, TimetableEntry[]>();
  for (const e of entries) byDay.set(e.weekday, [...(byDay.get(e.weekday) ?? []), e]);
  const out: Occurrence[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (skip(d)) continue;
    for (const entry of byDay.get(weekday(d)) ?? []) {
      if (!existing.has(`${entry.id}|${d}`)) out.push({ templateId: entry.id, date: d, entry });
    }
  }
  return out;
}

/** Entries that overlap another entry on the same day (a teacher can't be in two places). */
export function overlappingEntries(entries: TimetableEntry[]): Set<string> {
  const bad = new Set<string>();
  for (const a of entries)
    for (const b of entries)
      if (a.id !== b.id && a.weekday === b.weekday && timeToMin(a.start) < timeToMin(b.end) && timeToMin(b.start) < timeToMin(a.end)) {
        bad.add(a.id);
        bad.add(b.id);
      }
  return bad;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}
