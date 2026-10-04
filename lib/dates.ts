import type { HHMM, ISODate } from "./types";

/** The prototype runs on a fixed demo clock so the flow matches the mockups. */
export const DEMO_TODAY: ISODate = "2026-10-05";
export const DEMO_NOW: HHMM = "09:05";

const DAYS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const DAYS_SHORT = ["ΚΥΡ", "ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ"];
const MONTHS_GEN = [
  "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
  "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
];
const MONTHS_SHORT = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function parse(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function format(dt: Date): ISODate {
  return dt.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const dt = parse(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return format(dt);
}

export function weekday(d: ISODate): number {
  return parse(d).getUTCDay();
}

export function startOfWeek(d: ISODate): ISODate {
  const wd = weekday(d);
  return addDays(d, wd === 0 ? -6 : 1 - wd);
}

export function weekDates(monday: ISODate): ISODate[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function dayName(d: ISODate): string {
  return DAYS[weekday(d)];
}

export function dayShort(d: ISODate): string {
  return DAYS_SHORT[weekday(d)];
}

export function dayOfMonth(d: ISODate): number {
  return parse(d).getUTCDate();
}

/** "Δευτέρα, 5 Οκτωβρίου" */
export function longDate(d: ISODate): string {
  const dt = parse(d);
  return `${DAYS[dt.getUTCDay()]}, ${dt.getUTCDate()} ${MONTHS_GEN[dt.getUTCMonth()]}`;
}

/** "5 Οκτωβρίου" */
export function dayMonth(d: ISODate): string {
  const dt = parse(d);
  return `${dt.getUTCDate()} ${MONTHS_GEN[dt.getUTCMonth()]}`;
}

/** "5 Οκτ" */
export function shortDate(d: ISODate): string {
  const dt = parse(d);
  return `${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()]}`;
}

export function timeToMin(t: HHMM): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 45) return "μόλις τώρα";
  const m = Math.round(s / 60);
  if (m < 60) return `πριν ${m} λεπ.`;
  const h = Math.round(m / 60);
  if (h < 24) return `πριν ${h} ώρ.`;
  const dt = new Date(ts);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`;
}
