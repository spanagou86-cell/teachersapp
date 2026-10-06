import type { Country } from "./schoolYear";
import type { Subject, SubjectId } from "./types";

type Name = readonly [name: string, short: string];

/** What each system calls a subject. A slug a country doesn't teach has no name there. */
const NAMES: Record<SubjectId, Partial<Record<Country, Name>>> = {
  glossa: { gr: ["Γλώσσα", "ΓΛ"], cy: ["Ελληνικά", "ΕΛ"] },
  math: { gr: ["Μαθηματικά", "ΜΑ"], cy: ["Μαθηματικά", "ΜΑ"] },
  meleti: { gr: ["Μελέτη Περιβάλλοντος", "ΜΠ"] },
  eikastika: { gr: ["Εικαστικά", "ΕΙ"], cy: ["Τέχνη", "ΤΕ"] },
  istoria: { gr: ["Ιστορία", "ΙΣ"], cy: ["Ιστορία", "ΙΣ"] },
  fysika: { gr: ["Φυσικά", "ΦΥ"], cy: ["Φυσικές Επιστήμες", "ΦΕ"] },
  geografia: { gr: ["Γεωγραφία", "ΓΕ"], cy: ["Γεωγραφία", "ΓΕ"] },
  agglika: { gr: ["Αγγλικά", "ΑΓ"], cy: ["Αγγλικά", "ΑΓ"] },
  thriskeftika: { gr: ["Θρησκευτικά", "ΘΡ"], cy: ["Θρησκευτικά", "ΘΡ"] },
  mousiki: { gr: ["Μουσική", "ΜΟ"], cy: ["Μουσική", "ΜΟ"] },
  fa: { gr: ["Φυσική Αγωγή", "ΦΑ"], cy: ["Φυσική Αγωγή", "ΦΑ"] },
  zoi: { cy: ["Αγωγή Ζωής", "ΑΖ"] },
  kpa: { cy: ["Κοινωνική και Πολιτική Αγωγή", "ΚΠ"] },
  aeiforia: { cy: ["Αειφόρος Ανάπτυξη", "ΑΑ"] },
  tpe: { gr: ["Πληροφορική", "ΤΠ"] },
  ergastiria: { gr: ["Εργαστήρια Δεξιοτήτων", "ΕΔ"] },
  allo: { gr: ["Άλλο", "··"], cy: ["Άλλο", "··"] },
};

/** The order of each country's timetable (Cyprus: the Ministry's ωρολόγιο πρόγραμμα). */
const ORDER: Record<Country, SubjectId[]> = {
  gr: ["glossa", "math", "meleti", "eikastika", "istoria", "fysika", "geografia", "agglika", "thriskeftika", "mousiki", "fa", "tpe", "ergastiria", "allo"],
  cy: ["glossa", "math", "istoria", "thriskeftika", "geografia", "fysika", "eikastika", "mousiki", "fa", "agglika", "zoi", "kpa", "aeiforia", "allo"],
};

const cache = new Map<Country, Subject[]>();

/**
 * Every subject with the country's names: its own curriculum first, then the other system's
 * (marked `legacy`) so lessons and materials made before a change of country keep their name.
 */
export function subjectsFor(country: Country): Subject[] {
  const hit = cache.get(country);
  if (hit) return hit;
  const other: Country = country === "cy" ? "gr" : "cy";
  const make = (id: SubjectId, [name, short]: Name, legacy: boolean): Subject => (legacy ? { id, name, short, legacy } : { id, name, short });
  const list = [
    ...ORDER[country].map((id) => make(id, NAMES[id][country]!, false)),
    ...ORDER[other].filter((id) => !NAMES[id][country]).map((id) => make(id, NAMES[id][other]!, true)),
  ];
  cache.set(country, list);
  return list;
}

export const subjectName = (country: Country, id: string | undefined) => subjectsFor(country).find((s) => s.id === id)?.name ?? "";

/** What a picker offers: the country's subjects, plus the current one if it comes from the other system. */
export const subjectChoices = (list: Subject[], current?: string) => list.filter((s) => !s.legacy || s.id === current);

/**
 * Weekly periods per grade, Α΄ to ΣΤ΄, in Cyprus public primary schools (Ministry timetable,
 * 35 forty-minute periods a week in every grade).
 */
export const CY_PERIODS: Partial<Record<SubjectId, readonly number[]>> = {
  glossa: [12, 12, 10, 10, 9, 9],
  math: [7, 7, 7, 7, 6, 6],
  istoria: [0, 0, 2, 2, 2, 2],
  thriskeftika: [2, 2, 2, 2, 2, 2],
  geografia: [2, 2, 2, 2, 2, 2],
  fysika: [2, 2, 2, 2, 2, 2],
  eikastika: [2, 2, 2, 2, 2, 2],
  mousiki: [2, 2, 2, 2, 2, 2],
  fa: [2, 2, 2, 2, 3, 3],
  agglika: [2, 2, 2, 2, 2, 2],
  zoi: [2, 2, 2, 2, 0, 0],
  kpa: [0, 0, 0, 0, 2, 2],
  aeiforia: [0, 0, 0, 0, 1, 1],
};
