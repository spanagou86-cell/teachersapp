import { GRADES } from "../grades";
import type { ClassGroup, SubjectId } from "../types";
import type { ReadEntry } from "./client";

/** "Ε΄2", "ε2", "E 2" (Latin E) → "ε2". */
export function normClass(name: string): string {
  const latin: Record<string, string> = { a: "α", b: "β", e: "ε", z: "ζ", h: "η", i: "ι", k: "κ", m: "μ", n: "ν", o: "ο", p: "ρ", t: "τ", y: "υ", x: "χ" };
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[΄'`ʹ’\s.\-_/]/g, "")
    .replace(/[a-z]/g, (c) => latin[c] ?? c);
}

const SUBJECT_WORDS: [RegExp, SubjectId][] = [
  [/γλωσσ|νεοελλ|γλ\b/, "glossa"],
  [/μαθημ|μαθ\b/, "math"],
  [/μελετ|περιβαλλ/, "meleti"],
  [/ιστορ/, "istoria"],
  [/φυσικη αγωγ|γυμναστ|φ\.?α\b/, "fa"],
  [/φυσικ|φυσ\b|πειραμ/, "fysika"],
  [/γεωγρ/, "geografia"],
  [/αγγλ|english/, "agglika"],
  [/θρησκ/, "thriskeftika"],
  [/εικαστ|καλλιτεχ/, "eikastika"],
  [/μουσ/, "mousiki"],
  [/πληροφ|τπε|τ\.π\.ε|υπολογ/, "tpe"],
  [/εργαστ|δεξιοτ/, "ergastiria"],
];

export function matchSubject(name = ""): SubjectId {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return SUBJECT_WORDS.find(([re]) => re.test(n))?.[1] ?? "allo";
}

/** Grade from the class name: "Ε2" → Ε΄ Δημοτικού. */
export function gradeFromName(name: string): string {
  const n = normClass(name);
  if (n.startsWith("στ")) return GRADES[5];
  const i = ["α", "β", "γ", "δ", "ε"].indexOf(n[0]);
  return i >= 0 ? GRADES[i] : GRADES[8];
}

export interface ImportPlan {
  periods: { start: string; end: string }[];
  cells: { weekday: number; start: string; end: string; kind: ReadEntry["kind"]; className?: string; classId?: string; subjectId?: SubjectId; label: string }[];
  /** Class names found in the timetable that the teacher doesn't have yet. */
  newClasses: string[];
}

export function planImport(entries: ReadEntry[], classes: ClassGroup[]): ImportPlan {
  const byNorm = new Map(classes.map((c) => [normClass(c.name), c.id]));
  const newClasses: string[] = [];
  const seen = new Set<string>();
  const cells: ImportPlan["cells"] = [];
  for (const e of entries) {
    const key = `${e.weekday}|${e.start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const className = e.kind === "lesson" ? e.className?.trim() : undefined;
    if (className && !byNorm.has(normClass(className)) && !newClasses.some((n) => normClass(n) === normClass(className))) newClasses.push(className);
    const subjectId = e.kind === "lesson" ? matchSubject(e.subject) : undefined;
    cells.push({
      weekday: e.weekday,
      start: e.start,
      end: e.end,
      kind: e.kind,
      className,
      classId: e.kind !== "lesson" ? undefined : className ? byNorm.get(normClass(className)) : classes.length === 1 ? classes[0].id : undefined,
      subjectId,
      label: (subjectId === "allo" ? e.subject : e.label)?.trim().slice(0, 60) ?? "",
    });
  }
  const periods = [...new Map(cells.map((c) => [`${c.start}|${c.end}`, { start: c.start, end: c.end }])).values()].sort((a, b) => (a.start === b.start ? a.end.localeCompare(b.end) : a.start.localeCompare(b.start)));
  return { periods, cells, newClasses };
}
