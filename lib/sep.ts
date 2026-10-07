import type { AttendanceRecord, ISODate } from "./types";
import { addDays } from "./dates";

/**
 * Σχολική Έκθεση Προόδου (ΣΕΠ) of Cyprus primary schools, as in the Ministry's form
 * ΥΠΑΝ ΔΔΕ Π12 (2025): 17 skills/behaviours, the learning areas of the curriculum,
 * absences per τετράμηνο, and the Υποβοηθητικό ευρετήριο behind every skill.
 */

export type Term = 1 | 2;
export type Rating = 1 | 2 | 3 | 4;

export interface Skill {
  id: string;
  label: string;
  /** Υποβοηθητικό ευρετήριο: what the skill looks like in class. */
  hints: string[];
}

export interface SkillGroup {
  id: "learning" | "emotional" | "social";
  title: string;
  skills: Skill[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: "learning",
    title: "Μαθησιακές δεξιότητες / συμπεριφορές",
    skills: [
      { id: "focus", label: "Συγκεντρώνεται στο μάθημα", hints: ["Είναι προσεκτικός/ή", "Είναι συγκεντρωμένος/η", "Ανταποκρίνεται στις οδηγίες"] },
      {
        id: "engages",
        label: "Συμμετέχει ενεργά στη διαδικασία μάθησης",
        hints: ["Ρωτά και απαντά σε ερωτήσεις", "Παρουσιάζει περιέργεια και εξερευνά", "Αναλαμβάνει πρωτοβουλίες και δράση", "Δραστηριοποιείται ενεργά στο μάθημα", "Εργάζεται αυτόνομα στο επίπεδο της ηλικίας του/της"],
      },
      {
        id: "persists",
        label: "Επιμένει όταν η εργασία είναι δύσκολη",
        hints: ["Προσπαθεί με επιμονή να φέρει σε πέρας αυτό που αναλαμβάνει", "Αναζητά νέες πληροφορίες και λύσεις", "Ζητά βοήθεια όταν δεν μπορεί να ανταποκριθεί"],
      },
      { id: "improves", label: "Προσπαθεί να βελτιώνεται συνεχώς", hints: ["Ενδιαφέρεται για την πρόοδό του/της", "Αναγνωρίζει τα δυνατά σημεία και τις αδυναμίες του/της", "Επιδιώκει τη συνεχή βελτίωση"] },
      {
        id: "careful",
        label: "Πραγματοποιεί προσεγμένες εργασίες",
        hints: ["Πραγματοποιεί έγκαιρα τις εργασίες του/της", "Παραδίδει εργασίες με ιδιαίτερη φροντίδα και επιμέλεια", "Παραδίδει εργασίες που τις διακρίνει η δημιουργικότητα"],
      },
      {
        id: "critical",
        label: "Παρουσιάζει δεξιότητες κριτικής σκέψης",
        hints: ["Αναπτύσσει επιχειρήματα για να υποστηρίξει μια θέση", "Απαντά σε αντίθετα επιχειρήματα", "Εξάγει συμπεράσματα από ανάλυση δεδομένων", "Αξιολογεί στη βάση κριτηρίων", "Καταθέτει εναλλακτικές ιδέες και λύσεις"],
      },
      {
        id: "metacog",
        label: "Παρουσιάζει μεταγνωστικές δεξιότητες",
        hints: ["Γνωρίζει τι γνωρίζει, τι δεν γνωρίζει και τι πρέπει να μάθει", "Ανακαλεί την προαπαιτούμενη γνώση", "Μεταφέρει τη γνώση σε νέες καταστάσεις", "Δείχνει θετική στάση για τον εαυτό ως μαθητή", "Αυτοαξιολογείται"],
      },
    ],
  },
  {
    id: "emotional",
    title: "Συναισθηματικές δεξιότητες / συμπεριφορές",
    skills: [
      { id: "likes", label: "Δείχνει να του/της αρέσει το σχολείο", hints: ["Αισθάνεται άνετα στην τάξη/στο σχολείο", "Συμμετέχει πρόθυμα σε δραστηριότητες", "Προσαρμόζεται στο σχολικό περιβάλλον"] },
      {
        id: "feelings",
        label: "Εκφράζει και ελέγχει τα συναισθήματά του/της",
        hints: ["Μοιράζεται συναισθήματα με άλλους", "Αναγνωρίζει συναισθήματα σε ιστορίες και περιστατικά", "Συζητά ό,τι τον/την ενοχλεί", "Διαχειρίζεται τα συναισθήματά του/της με αυτοέλεγχο"],
      },
      { id: "confidence", label: "Διαθέτει αυτοπεποίθηση", hints: ["Δεν τα βάζει εύκολα κάτω", "Αναλαμβάνει πρωτοβουλίες και ρίσκα", "Αναλαμβάνει ηγετικούς ρόλους", "Έχει το θάρρος της γνώμης του/της"] },
      {
        id: "empathy",
        label: "Παρουσιάζει δεξιότητες ενσυναίσθησης",
        hints: ["Καταλαβαίνει τι νιώθει ο άλλος και γιατί", "Βοηθά κάποιον να ξεπεράσει μια δύσκολη θέση", "Μπαίνει στη θέση του άλλου", "Προκαλεί θετικά συναισθήματα στους άλλους"],
      },
      {
        id: "esteem",
        label: "Διαθέτει αυτοεκτίμηση",
        hints: ["Γνωρίζει ότι μπορεί να επιτύχει", "Εκφράζει θετικές σκέψεις", "Επιμένει στην ολοκλήρωση αυτού που αναλαμβάνει", "Εκφράζεται ελεύθερα", "Κατανοεί τα όρια της συμπεριφοράς του/της"],
      },
    ],
  },
  {
    id: "social",
    title: "Κοινωνικές δεξιότητες / συμπεριφορές",
    skills: [
      { id: "classrules", label: "Σέβεται τους κανόνες της τάξης", hints: ["Εφαρμόζει τον συμφωνημένο κώδικα της τάξης", "Δείχνει αυτοπειθαρχία", "Ελέγχει τη συμπεριφορά του/της"] },
      { id: "schoolrules", label: "Σέβεται τους κανόνες του σχολείου", hints: ["Εφαρμόζει τον κώδικα συμπεριφοράς του σχολείου", "Δείχνει αυτοπειθαρχία στα διαλείμματα και στις κοινές εκδηλώσεις"] },
      {
        id: "cooperates",
        label: "Επικοινωνεί και συνεργάζεται με τους άλλους",
        hints: ["Μοιράζεται σκέψεις και ιδέες", "Δημιουργεί ευχάριστο κλίμα στην επικοινωνία", "Συμβάλλει στους στόχους της ομάδας και της τάξης"],
      },
      { id: "respects", label: "Σέβεται τους άλλους", hints: ["Συμπεριφέρεται με ευγένεια", "Εκφράζεται με θετικά λόγια για τους άλλους", "Σέβεται τη διαφορετικότητα και τα δικαιώματα των άλλων"] },
      {
        id: "conflicts",
        label: "Συμβάλλει εποικοδομητικά στην επίλυση διαφορών",
        hints: ["Διαπραγματεύεται για λύσεις και συμβιβασμούς", "Προτείνει λύσεις που μετριάζουν τα αρνητικά συναισθήματα", "Αποφεύγει το κλίμα νικητή–ηττημένου"],
      },
    ],
  },
];

export const SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);

/** ★ scale for skills and behaviours. */
export const FREQUENCY: Record<Rating, string> = { 4: "Τις περισσότερες φορές", 3: "Συχνά", 2: "Μερικές φορές", 1: "Σπάνια" };
/** ★ scale for the learning areas: how far the curriculum's outcomes were reached. */
export const ACHIEVEMENT: Record<Rating, string> = { 4: "Επιτεύχθηκαν πλήρως", 3: "Επιτεύχθηκαν επαρκώς", 2: "Επιτεύχθηκαν μερικώς", 1: "Δεν επιτεύχθηκαν ικανοποιητικά" };

export interface Area {
  id: string;
  label: string;
  /** Parent subject for the sub-areas of Ελληνικά and Μαθηματικά. */
  group?: "greek" | "maths";
}

export const AREAS: Area[] = [
  { id: "gr-listen", label: "Κατανόηση προφορικού λόγου", group: "greek" },
  { id: "gr-speak", label: "Παραγωγή προφορικού λόγου", group: "greek" },
  { id: "gr-read", label: "Κατανόηση γραπτού λόγου", group: "greek" },
  { id: "gr-write", label: "Παραγωγή γραπτού λόγου", group: "greek" },
  { id: "ma-num", label: "Αριθμοί και πράξεις", group: "maths" },
  { id: "ma-measure", label: "Μέτρηση", group: "maths" },
  { id: "ma-geometry", label: "Γεωμετρία", group: "maths" },
  { id: "ma-algebra", label: "Άλγεβρα", group: "maths" },
  { id: "ma-stats", label: "Στατιστική και πιθανότητες", group: "maths" },
  { id: "english", label: "Αγγλικά" },
  { id: "health", label: "Αγωγή Υγείας" },
  { id: "geography", label: "Γεωγραφία" },
  { id: "art", label: "Εικαστικές Τέχνες" },
  { id: "religion", label: "Θρησκευτικά" },
  { id: "history", label: "Ιστορία" },
  { id: "music", label: "Μουσική" },
  { id: "environment", label: "Περιβαλλοντική Εκπαίδευση" },
  { id: "design", label: "Σχεδιασμός και Τεχνολογία" },
  { id: "science", label: "Φυσικές Επιστήμες" },
  { id: "pe", label: "Φυσική Αγωγή" },
];

export const AREA_GROUP_LABEL = { greek: "Ελληνικά", maths: "Μαθηματικά" } as const;

/** Texts of a report: strengths / areas of growth per subject, remarks, and settings. */
export interface ReportTexts {
  "greek.strengths"?: string;
  "greek.growth"?: string;
  "maths.strengths"?: string;
  "maths.growth"?: string;
  "other.strengths"?: string;
  "other.growth"?: string;
  remarks?: string;
  /** For grammar only («ο μαθητής» / «η μαθήτρια»); never sent with a name. */
  gender?: "m" | "f";
  /** Days the teacher marked as justified, when it differs from the count. */
  excused?: number;
  /** Written by the AI and not yet checked by the teacher. */
  draft?: boolean;
}

export const TEXT_KEYS = ["greek.strengths", "greek.growth", "maths.strengths", "maths.growth", "other.strengths", "other.growth", "remarks"] as const;
export type TextKey = (typeof TEXT_KEYS)[number];

export interface ProgressReport {
  studentId: string;
  year: number;
  term: Term;
  ratings: Record<string, Rating>;
  texts: ReportTexts;
  reviewed: boolean;
  updatedAt: number;
}

export const reportKey = (studentId: string, year: number, term: Term) => `${studentId}|${year}|${term}`;

/**
 * Τετράμηνα of the Cypriot primary school: Α΄ from the first day to the end of January,
 * Β΄ from February to the last day. The ΣΕΠ is filled in mid-January and early June.
 */
export function termRange(year: { start: ISODate; end: ISODate }, term: Term): { from: ISODate; to: ISODate } {
  const jan31 = `${Number(year.start.slice(0, 4)) + 1}-01-31`;
  return term === 1 ? { from: year.start, to: jan31 } : { from: addDays(jan31, 1), to: year.end };
}

/** The τετράμηνο a date belongs to; the summer counts as Β΄. */
export const termFor = (year: { start: ISODate }, date: ISODate): Term => (date <= `${Number(year.start.slice(0, 4)) + 1}-01-31` ? 1 : 2);

/** Days a pupil was absent in a period, from the daily attendance of the class. */
export function absentDays(attendance: Record<string, AttendanceRecord>, classId: string, studentId: string, from: ISODate, to: ISODate): number {
  let days = 0;
  for (const [key, r] of Object.entries(attendance)) {
    const [c, date] = key.split("|");
    if (c === classId && date >= from && date <= to && r.absentIds.includes(studentId)) days++;
  }
  return days;
}

/** How complete a report is: ratings given out of the 17 skills and the areas in use. */
export function progress(r: ProgressReport | undefined, areaIds: string[]): { done: number; total: number } {
  const ids = [...SKILLS.map((s) => s.id), ...areaIds];
  return { done: r ? ids.filter((id) => r.ratings[id]).length : 0, total: ids.length };
}

/** A best guess from the first name for Greek grammar, always shown so the teacher can change it. */
export function guessGender(firstName: string): "m" | "f" {
  const n = firstName.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /(ος|ης|ας|ων|ους|ις)$/.test(n) ? "m" : "f";
}

/** Stars for print: ★★★☆ style, empty when unrated. */
export const stars = (r?: Rating) => (r ? "★".repeat(r) : "");
