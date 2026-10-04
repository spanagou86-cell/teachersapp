import { buildBlocks } from "./ai/templates";
import { addDays, DEMO_TODAY, startOfWeek } from "./dates";
import { PERIODS } from "./schedule";
import type { AttendanceRecord, ClassGroup, ClassNote, LessonSlot, Material, Student, Subject, SubjectId, Task } from "./types";

export const SUBJECTS: Subject[] = [
  { id: "glossa", name: "Γλώσσα", short: "ΓΛ" },
  { id: "math", name: "Μαθηματικά", short: "ΜΑ" },
  { id: "meleti", name: "Μελέτη Περιβάλλοντος", short: "ΜΠ" },
  { id: "eikastika", name: "Εικαστικά", short: "ΕΙ" },
];

export const CLASSES: ClassGroup[] = [
  { id: "d1", name: "Δ1", grade: "Δ΄ Δημοτικού", room: "Αίθουσα 1" },
  { id: "d2", name: "Δ2", grade: "Δ΄ Δημοτικού", room: "Αίθουσα 4" },
];

const D1_NAMES = [
  "Μαρία Κ.", "Νίκος Π.", "Ελένη Α.", "Γιώργος Δ.", "Άννα Μ.", "Πέτρος Σ.", "Δήμητρα Λ.", "Κωνσταντίνος Β.",
  "Σοφία Ρ.", "Αλέξανδρος Τ.", "Χριστίνα Ν.", "Παναγιώτης Ζ.", "Ιωάννα Θ.", "Βασίλης Ε.", "Κατερίνα Φ.", "Δημήτρης Χ.",
  "Αγγελική Γ.", "Μιχάλης Ο.", "Ευαγγελία Κ.", "Στέλιος Μ.", "Θεοδώρα Π.", "Λευτέρης Α.", "Ζωή Σ.", "Άρης Κ.",
];
const D2_NAMES = [
  "Φωτεινή Β.", "Ανδρέας Λ.", "Μυρτώ Κ.", "Σπύρος Δ.", "Ναταλία Ρ.", "Θάνος Ε.", "Δανάη Τ.", "Ηλίας Μ.",
  "Ραφαέλα Ζ.", "Οδυσσέας Ν.", "Νεφέλη Χ.", "Μάριος Γ.", "Αφροδίτη Σ.", "Τάσος Π.", "Ειρήνη Α.", "Φίλιππος Κ.",
  "Λυδία Θ.", "Χάρης Β.", "Βασιλική Ο.", "Γρηγόρης Φ.", "Έλενα Μ.", "Στάθης Λ.",
];

function students(classId: string, names: string[]): Student[] {
  return names.map((n, i) => {
    const [firstName, lastName] = n.split(" ");
    return { id: `${classId}-s${i + 1}`, classId, firstName, lastName };
  });
}

export const STUDENTS: Student[] = [...students("d1", D1_NAMES), ...students("d2", D2_NAMES)];

const TOPICS: Record<SubjectId, string[]> = {
  glossa: ["Επαναληπτικές ασκήσεις – Ορθογραφία", "Ο πληθυντικός των ουσιαστικών", "Κατανόηση κειμένου: «Το ποτάμι»", "Γράφω μια περιγραφή", "Ρήματα σε -ίζω", "Παραγωγή λόγου: Μια επιστολή", "Λεξιλόγιο: συνώνυμα", "Σημεία στίξης", "Διαβάζω ένα ποίημα", "Ορθογραφία: -ει / -οι", "Μικρή υπαγόρευση", "Λέξεις με διπλά σύμφωνα", "Επανάληψη ενότητας"],
  math: ["Γραφικές παραστάσεις", "Πρόσθεση τριψήφιων", "Αφαίρεση με κρατούμενο", "Προπαίδεια του 6 και του 8", "Προβλήματα δύο πράξεων", "Κλάσματα — επανάληψη", "Μετρήσεις μήκους", "Η διαίρεση ως μοιρασιά", "Γεωμετρικά σχήματα", "Χρήματα και ρέστα", "Επανάληψη ενότητας"],
  meleti: ["Το νερό στον τόπο μας", "Ο κύκλος του νερού", "Οικονομία στο νερό", "Ο χάρτης της περιοχής μας", "Επάγγελμα και τόπος", "Επανάληψη ενότητας"],
  eikastika: ["Δημιουργία αφίσας – Ομαδική εργασία", "Χρώματα θερμά και ψυχρά", "Κολάζ με ανακυκλώσιμα"],
};

/** Weekly timetable: [weekday 1–5, period index, class, subject]. */
const TIMETABLE: [number, number, string, SubjectId][] = [
  [1, 0, "d1", "glossa"], [1, 2, "d1", "math"], [1, 3, "d2", "meleti"], [1, 5, "d1", "eikastika"],
  [2, 0, "d1", "math"], [2, 2, "d1", "glossa"], [2, 4, "d1", "meleti"],
  [3, 0, "d1", "glossa"], [3, 1, "d2", "math"], [3, 3, "d1", "meleti"], [3, 5, "d2", "eikastika"],
  [4, 0, "d1", "math"], [4, 2, "d2", "glossa"], [4, 3, "d1", "glossa"],
  [5, 0, "d1", "glossa"], [5, 2, "d1", "math"], [5, 4, "d2", "meleti"],
];

const PAST_NOTES: Partial<Record<SubjectId, string>> = {
  glossa: "Ολοκληρώθηκε η ενότητα. Δυσκολία στις καταλήξεις -ει/-οι — επανάληψη τη Δευτέρα.",
  math: "Καλή συμμετοχή. 4 μαθητές χρειάζονται επιπλέον εξάσκηση στο κρατούμενο.",
  meleti: "Συζήτηση και εργασία σε ομάδες.",
  eikastika: "Οι ομάδες διάλεξαν θέμα.",
};

function buildSlots(): LessonSlot[] {
  const thisWeek = startOfWeek(DEMO_TODAY);
  const weeks = [addDays(thisWeek, -7), thisWeek, addDays(thisWeek, 7)];
  const counters: Record<string, number> = {};
  const slots: LessonSlot[] = [];
  // Topic order runs in reverse for the past week so this Monday shows the mockup topics.
  weeks.forEach((monday, w) => {
    for (const [wd, p, classId, subjectId] of TIMETABLE) {
      const key = `${classId}-${subjectId}`;
      const date = addDays(monday, wd - 1);
      const list = TOPICS[subjectId];
      const isPast = date < DEMO_TODAY;
      const n = isPast ? list.length - 1 - (counters[`past-${key}`] = (counters[`past-${key}`] ?? -1) + 1) : (counters[key] = (counters[key] ?? -1) + 1);
      const topic = list[((n % list.length) + list.length) % list.length];
      slots.push({
        id: `l-${date}-${PERIODS[p].start.replace(":", "")}`,
        date,
        start: PERIODS[p].start,
        end: PERIODS[p].end,
        classId,
        subjectId,
        topic,
        materialIds: [],
        status: isPast ? (w === 0 && wd === 5 && subjectId === "math" ? "partial" : "done") : "planned",
        taughtNote: isPast ? PAST_NOTES[subjectId] ?? "" : "",
      });
    }
  });
  return slots;
}

function seedMaterials(): Material[] {
  const graph = buildBlocks({ subjectId: "math", kind: "worksheet", level: "standard", grade: "Δ΄ Δημοτικού", hint: "γραφικές", prefix: "m1" });
  const fractions = buildBlocks({ subjectId: "math", kind: "summary", level: "standard", grade: "Δ΄ Δημοτικού", hint: "", prefix: "m2" });
  const at = Date.UTC(2026, 9, 3, 16, 20);
  return [
    {
      id: "m1",
      title: "Γραφικές παραστάσεις",
      classId: "d1",
      subjectId: "math",
      kind: "worksheet",
      level: "standard",
      withSolutions: true,
      blackAndWhite: false,
      file: { name: "grafikes_parastaseis.pdf", size: 2_400_000, type: "application/pdf" },
      originalBlocks: graph,
      blocks: graph,
      versions: [{ id: "m1-v1", at, label: "Δημιουργία από αρχείο", blocks: graph }],
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "m2",
      title: "Κλάσματα — επανάληψη",
      classId: "d1",
      subjectId: "math",
      kind: "summary",
      level: "standard",
      withSolutions: false,
      blackAndWhite: false,
      file: { name: "klasmata_epanalipsi.docx", size: 1_150_000, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      originalBlocks: fractions,
      blocks: fractions,
      versions: [{ id: "m2-v1", at: at - 2 * 86_400_000, label: "Δημιουργία από αρχείο", blocks: fractions }],
      createdAt: at - 2 * 86_400_000,
      updatedAt: at - 2 * 86_400_000,
    },
  ];
}

function seedAttendance(): Record<string, AttendanceRecord> {
  const thisWeek = startOfWeek(DEMO_TODAY);
  const out: Record<string, AttendanceRecord> = {};
  const absences: Record<string, number[]> = { d1: [4, 6, 0, 4, 11], d2: [2, 0, 9, 0, 5] };
  for (const c of ["d1", "d2"]) {
    for (let i = 0; i < 5; i++) {
      const date = addDays(thisWeek, i - 7);
      const a = absences[c][i];
      out[`${c}|${date}`] = { absentIds: a ? [`${c}-s${a}`] : [], recordedAt: Date.UTC(2026, 8, 28 + i, 8, 5) };
    }
  }
  return out;
}

export interface SeedState {
  subjects: Subject[];
  classes: ClassGroup[];
  students: Student[];
  slots: LessonSlot[];
  materials: Material[];
  attendance: Record<string, AttendanceRecord>;
  tasks: Task[];
  notes: ClassNote[];
}

export function seed(): SeedState {
  const materials = seedMaterials();
  const slots = buildSlots().map((s) => (s.id === `l-${DEMO_TODAY}-0920` ? { ...s, materialIds: ["m1"] } : s));
  return {
    subjects: SUBJECTS,
    classes: CLASSES,
    students: STUDENTS,
    slots,
    materials,
    attendance: seedAttendance(),
    tasks: [
      { id: "t1", text: "Εκτύπωση φύλλων εργασίας", done: true },
      { id: "t2", text: "Συνάντηση γονέα", time: "13:15", detail: "Γονέας: Μαρία Κ.", done: false },
      { id: "t3", text: "Προετοιμασία αυριανού μαθήματος", done: false },
    ],
    notes: [
      { id: "n1", classId: "d1", date: addDays(DEMO_TODAY, -3), text: "Η Άννα Μ. θα λείπει την Πέμπτη για αγώνες κολύμβησης.", createdAt: Date.UTC(2026, 9, 2, 12, 0) },
      { id: "n2", classId: "d1", date: addDays(DEMO_TODAY, -4), text: "Η ομάδα του Νίκου Π. ολοκλήρωσε την αφίσα πρώτη — να παρουσιάσουν.", createdAt: Date.UTC(2026, 9, 1, 12, 0) },
    ],
  };
}
