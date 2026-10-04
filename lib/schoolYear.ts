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

/** The school year (September–June) that contains a date; summer belongs to the coming year. */
export function schoolYearStart(date: ISODate): number {
  const [y, m] = date.split("-").map(Number);
  return m >= 7 ? y : y - 1;
}

const cache = new Map<string, SchoolYear>();

/**
 * Indicative calendar from the usual rules of each ministry. Teachers can check it
 * against the year's circular; dates move little from year to year.
 */
export function schoolYear(country: Country, startYear: number): SchoolYear {
  const key = `${country}${startYear}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const y1 = startYear;
  const y2 = startYear + 1;
  const easter = orthodoxEaster(y2);
  const one = (d: ISODate, label: string): Range => ({ from: d, to: d, label });
  const common: Range[] = [
    one(iso(y1, 10, 28), "28η Οκτωβρίου"),
    one(addDays(easter, -48), "Καθαρά Δευτέρα"),
    one(iso(y2, 3, 25), "25η Μαρτίου"),
    { from: addDays(easter, -6), to: addDays(easter, 7), label: "Διακοπές Πάσχα" },
    one(iso(y2, 5, 1), "Πρωτομαγιά"),
  ];
  const feb = new Date(Date.UTC(y2, 2, 0)).getUTCDate();
  let year: SchoolYear;
  if (country === "gr") {
    const start = nextWeekday(iso(y1, 9, 11));
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
        ...common,
        { from: iso(y1, 12, 24), to: iso(y2, 1, 7), label: "Διακοπές Χριστουγέννων" },
        one(iso(y2, 1, 30), "Τριών Ιεραρχών"),
        one(addDays(easter, 50), "Αγίου Πνεύματος"),
      ],
    };
  } else {
    const start = nextWeekday(iso(y1, 9, 10));
    year = {
      country,
      start,
      end: iso(y2, 6, 18),
      terms: [
        { from: start, to: iso(y1, 12, 22), label: "Α΄ τρίμηνο" },
        { from: iso(y2, 1, 8), to: iso(y2, 3, 31), label: "Β΄ τρίμηνο" },
        { from: iso(y2, 4, 1), to: iso(y2, 6, 18), label: "Γ΄ τρίμηνο" },
      ],
      holidays: [
        ...common,
        one(iso(y1, 10, 1), "Ημέρα Ανεξαρτησίας"),
        { from: iso(y1, 12, 23), to: iso(y2, 1, 7), label: "Διακοπές Χριστουγέννων" },
        one(iso(y2, 4, 1), "1η Απριλίου"),
        one(addDays(easter, 50), "Κατακλυσμός"),
      ],
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
