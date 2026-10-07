export type ISODate = string; // YYYY-MM-DD
export type HHMM = string; // 09:20

export type SubjectId =
  | "glossa"
  | "math"
  | "meleti"
  | "eikastika"
  | "istoria"
  | "fysika"
  | "geografia"
  | "agglika"
  | "thriskeftika"
  | "mousiki"
  | "fa"
  | "tpe"
  | "ergastiria"
  | "zoi"
  | "kpa"
  | "aeiforia"
  | "allo";

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  /** Not taught in the teacher's country; kept for lessons made before a change of country. */
  legacy?: boolean;
}

export interface ClassGroup {
  id: string;
  name: string; // Δ1
  grade: string; // Δ΄ Δημοτικού
  room: string;
}

export interface Student {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
}

export type LessonStatus = "planned" | "done" | "partial" | "skipped";

export interface LessonSlot {
  id: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  classId: string;
  subjectId: SubjectId;
  topic: string;
  materialIds: string[];
  status: LessonStatus;
  taughtNote: string;
  /** Στόχοι / δραστηριότητες for the weekly programme (Κ.Δ.Π. 168/2024 άρθρο 39). */
  plan?: string;
  carriedFromId?: string;
  carriedToId?: string;
}

export type BlockKind = "duty" | "free" | "meeting";

/** Non-teaching parts of the day from the school timetable: παιδονομία, κενά, συσκέψεις. */
export interface TimeBlock {
  id: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  kind: BlockKind;
  label: string;
}

export interface TimetableEntry {
  id: string;
  weekday: number; // 1 = Monday … 5 = Friday
  start: HHMM;
  end: HHMM;
  kind: "lesson" | BlockKind;
  classId?: string;
  subjectId?: SubjectId;
  label: string;
}

export interface Profile {
  displayName: string;
  schoolName: string;
  onboarded: boolean;
  country: "gr" | "cy";
  /** The school's feast day (Άγιος της κοινότητας / πολιούχος), "MM-DD". */
  localHoliday?: string;
}

export interface StudentNote {
  id: string;
  studentId: string;
  kind: "note" | "parent";
  date: ISODate;
  text: string;
  createdAt: number;
}

export interface AttendanceRecord {
  absentIds: string[];
  lateIds?: string[];
  recordedAt: number;
}

export type MaterialKind = "worksheet" | "plan" | "quiz" | "summary" | "file";
export type Level = "basic" | "standard" | "advanced";

export interface ChartBar {
  label: string;
  value: number;
}

export interface Variant {
  text: string;
  answer?: string;
}

export interface Block {
  id: string;
  type: "heading" | "text" | "exercise" | "chart";
  text: string;
  answer?: string;
  /** Lines of answer space under an exercise. */
  lines?: number;
  level?: Level;
  variants?: Partial<Record<Level, Variant>>;
  /** Alternative wording used for version B of the sheet. */
  variantB?: Variant;
  chart?: { title: string; yLabel: string; bars: ChartBar[] };
}

export interface MaterialVersion {
  id: string;
  at: number;
  label: string;
  blocks: Block[];
}

export interface FileMeta {
  name: string;
  size: number;
  type: string;
  /** Key in IndexedDB holding the uploaded blob (demo mode). */
  blobKey?: string;
  /** Path in Supabase Storage (signed-in mode). */
  path?: string;
}

export interface Material {
  id: string;
  title: string;
  classId: string;
  subjectId: SubjectId;
  kind: MaterialKind;
  level: Level;
  withSolutions: boolean;
  blackAndWhite: boolean;
  file?: FileMeta;
  originalBlocks: Block[];
  blocks: Block[];
  versions: MaterialVersion[];
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  time?: HHMM;
  detail?: string;
}

export interface ClassNote {
  id: string;
  classId: string;
  date: ISODate;
  text: string;
  createdAt: number;
}
