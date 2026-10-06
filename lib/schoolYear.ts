import { addDays, weekday } from "./dates";
import type { ISODate } from "./types";

export type Country = "gr" | "cy";

export const COUNTRY_LABEL: Record<Country, string> = { gr: "Ελλάδα", cy: "Κύπρος" };

/** Wording that differs between the two systems. */
export const dutyLabel = (c: Country) => (c === "cy" ? "Παιδονομία" : "Εφημερία");

export interface Range {
  from: ISODate;
  to: ISODate;
  label: string;
}

export interface SchoolYear {
  country: Country;
  start: ISODate;
  end: ISODate;
  terms: Range[];
  holidays: Range[];
}

/** Bumped whenever the calendar rules change, so saved school years are checked against them again. */
export const CALENDAR_VERSION = 2;

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Orthodox Easter (Gregorian date), valid 1900–2099. */
export function orthodoxEaster(year: number): ISODate {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return addDays(iso(year, month, day), 13);
}

const nextWeekday = (d: ISODate) => (weekday(d) === 6 ? addDays(d, 2) : weekday(d) === 0 ? addDays(d, 1) : d);
const isWeekend = (d: ISODate) => weekday(d) === 0 || weekday(d) === 6;

/** The n-th `wd` (0 = Sunday) of a month. */
function nthWeekday(y: number, m: number, wd: number, n: number): ISODate {
  const first = iso(y, m, 1);
  return addDays(first, ((wd - weekday(first) + 7) % 7) + 7 * (n - 1));
}

/** The n-th `wd` of a month counting from its end (n = 1 is the last one). */
function nthLastWeekday(y: number, m: number, wd: number, n: number): ISODate {
  const last = iso(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
  return addDays(last, -((weekday(last) - wd + 7) % 7) - 7 * (n - 1));
}

/** The school year (September–June) that contains a date; summer belongs to the coming year. */
export function schoolYearStart(date: ISODate): number {
  const [y, m] = date.split("-").map(Number);
  return m >= 7 ? y : y - 1;
}

const cache = new Map<string, SchoolYear>();
let local: string | undefined;

/**
 * The school's own feast day (Άγιος της κοινότητας / πολιούχος): one day a year that every
 * school declares. Comes from the teacher's profile as "MM-DD".
 */
export function setLocalHoliday(mmdd?: string | null) {
  const next = mmdd && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(mmdd) ? mmdd : undefined;
  if (next === local) return;
  local = next;
  cache.clear();
}

/** That feast day inside the school year starting in `y1`, if it falls on a real date. */
function localDay(y1: number): Range[] {
  if (!local) return [];
  const [m, d] = local.split("-").map(Number);
  const y = m >= 7 ? y1 : y1 + 1;
  if (new Date(Date.UTC(y, m - 1, d)).getUTCDate() !== d) return [];
  return [{ from: iso(y, m, d), to: iso(y, m, d), label: "Τοπική γιορτή" }];
}

/** Keeps the days that would otherwise be school days: not weekends, inside the year, not inside a longer break. */
function tidy(list: Range[], start: ISODate, end: ISODate): Range[] {
  return list.filter(
    (h, i) =>
      h.to >= start &&
      h.from <= end &&
      !(
        h.from === h.to &&
        (isWeekend(h.from) || list.some((o, j) => (o.from !== o.to ? h.from >= o.from && h.from <= o.to : j < i && o.from === h.from)))
      ),
  );
}

/**
 * The calendar of each ministry. Cyprus follows the rules the Ministry publishes
 * (moec.gov.cy/dde/scholikes_argies.html), which give exactly its official lists;
 * Greece is indicative and moves little from year to year.
 */
export function schoolYear(country: Country, startYear: number): SchoolYear {
  const key = `${country}${startYear}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const y1 = startYear;
  const y2 = startYear + 1;
  const easter = orthodoxEaster(y2);
  const one = (d: ISODate, label: string): Range => ({ from: d, to: d, label });
  let year: SchoolYear;
  if (country === "gr") {
    const start = nextWeekday(iso(y1, 9, 11));
    const feb = new Date(Date.UTC(y2, 2, 0)).getUTCDate();
    year = {
      country,
      start,
      end: iso(y2, 6, 15),
      terms: [
        { from: start, to: iso(y1, 11, 30), label: "Α΄ τρίμηνο" },
        { from: iso(y1, 12, 1), to: iso(y2, 2, feb), label: "Β΄ τρίμηνο" },
        { from: iso(y2, 3, 1), to: iso(y2, 6, 15), label: "Γ΄ τρίμηνο" },
      ],
      holidays: [
        one(iso(y1, 10, 28), "28η Οκτωβρίου"),
        { from: iso(y1, 12, 24), to: iso(y2, 1, 7), label: "Διακοπές Χριστουγέννων" },
        one(iso(y2, 1, 30), "Τριών Ιεραρχών"),
        one(addDays(easter, -48), "Καθαρά Δευτέρα"),
        one(iso(y2, 3, 25), "25η Μαρτίου"),
        { from: addDays(easter, -6), to: addDays(easter, 7), label: "Διακοπές Πάσχα" },
        one(iso(y2, 5, 1), "Πρωτομαγιά"),
        one(addDays(easter, 50), "Αγίου Πνεύματος"),
        ...tidy(localDay(y1), start, iso(y2, 6, 15)),
      ],
    };
  } else {
    // Pupils start on the second Monday of September and finish on the Wednesday
    // before the second-to-last Friday of June.
    const start = nthWeekday(y1, 9, 1, 2);
    const end = addDays(nthLastWeekday(y2, 6, 5, 2), -2);
    const george = iso(y2, 4, 23);
    year = {
      country,
      start,
      end,
      // The Ministry's indicative programmes split the year at the Christmas and Easter breaks.
      terms: [
        { from: start, to: iso(y1, 12, 22), label: "Α΄ τρίμηνο" },
        { from: iso(y2, 1, 7), to: addDays(easter, -7), label: "Β΄ τρίμηνο" },
        { from: addDays(easter, 6), to: end, label: "Γ΄ τρίμηνο" },
      ],
      holidays: tidy(
        [
          one(iso(y1, 10, 1), "Ημέρα Ανεξαρτησίας"),
          one(iso(y1, 10, 28), "28η Οκτωβρίου"),
          { from: iso(y1, 12, 23), to: iso(y2, 1, 6), label: "Διακοπές Χριστουγέννων" },
          one(iso(y2, 1, 30), "Τριών Ιεραρχών"),
          one(addDays(easter, -48), "Καθαρά Δευτέρα"),
          one(iso(y2, 3, 25), "25η Μαρτίου"),
          one(iso(y2, 4, 1), "1η Απριλίου"),
          { from: addDays(easter, -6), to: addDays(easter, 5), label: "Διακοπές Πάσχα" },
          // The Archbishop's name day (Αγίου Γεωργίου) moves to Easter Monday when it falls before Easter.
          one(george < easter ? addDays(easter, 1) : george, "Ονομαστήρια Αρχιεπισκόπου"),
          one(iso(y2, 5, 1), "Πρωτομαγιά"),
          one(addDays(easter, 39), "Αναλήψεως"),
          one(addDays(easter, 50), "Αγίου Πνεύματος"),
          one(iso(y2, 6, 11), "Αποστόλου Βαρνάβα"),
          ...localDay(y1),
        ],
        start,
        end,
      ),
    };
  }
  year.holidays.sort((a, b) => (a.from < b.from ? -1 : 1));
  cache.set(key, year);
  return year;
}

export function yearFor(country: Country, date: ISODate): SchoolYear {
  return schoolYear(country, schoolYearStart(date));
}

/** Name of the holiday on a date, if any (weekends excluded). */
export function holidayOn(country: Country, date: ISODate): string | undefined {
  return yearFor(country, date).holidays.find((h) => date >= h.from && date <= h.to)?.label;
}

export function termOn(country: Country, date: ISODate): string | undefined {
  return yearFor(country, date).terms.find((t) => date >= t.from && date <= t.to)?.label;
}

/** School week number (week of the first school day = 1), or undefined outside the year. */
export function weekNumber(country: Country, date: ISODate): number | undefined {
  const y = yearFor(country, date);
  if (date < y.start || date > y.end) return undefined;
  const monday = (d: ISODate) => addDays(d, weekday(d) === 0 ? -6 : 1 - weekday(d));
  const days = (Date.parse(monday(date)) - Date.parse(monday(y.start))) / 86_400_000;
  return Math.round(days / 7) + 1;
}

export function isSchoolDay(country: Country, date: ISODate): boolean {
  const y = yearFor(country, date);
  const wd = weekday(date);
  return wd >= 1 && wd <= 5 && date >= y.start && date <= y.end && !holidayOn(country, date);
}
