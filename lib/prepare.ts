import { addDays, dayName, timeToMin } from "./dates";
import { sortSlots } from "./schedule";
import type { HHMM, ISODate, LessonSlot, MaterialKind } from "./types";

/** The four things «Ετοίμασε» makes, named after the result rather than the tool. */
export type PrepKind = "worksheet" | "quiz" | "levels" | "plan";

export const PREP: Record<PrepKind, { title: string; sub: string; kind: Exclude<MaterialKind, "file" | "summary"> }> = {
  worksheet: { title: "Φύλλο εργασίας", sub: "6–8 ασκήσεις, με λύσεις", kind: "worksheet" },
  quiz: { title: "Τεστ 10′", sub: "Σύντομος έλεγχος, με λύσεις", kind: "quiz" },
  levels: { title: "3 επίπεδα", sub: "Το ίδιο φύλλο σε Α, Β, Γ", kind: "worksheet" },
  plan: { title: "Σχέδιο μαθήματος", sub: "40′ σε φάσεις", kind: "plan" },
};

export const PREP_KINDS = Object.keys(PREP) as PrepKind[];

/** What each tile asks of the AI, on top of the lesson's own details. */
const ASK: Record<PrepKind, string> = {
  worksheet:
    "Φύλλο εργασίας για μάθημα 40 λεπτών: μία σύντομη οδηγία και 6–8 ασκήσεις διαφορετικών τύπων (συμπλήρωση, σωστό/λάθος, αντιστοίχιση, πρόβλημα), από τις πιο εύκολες στις πιο δύσκολες, με λύσεις.",
  quiz: "Σύντομο τεστ 10 λεπτών: μία οδηγία και 8–10 σύντομες ερωτήσεις που ελέγχουν τους στόχους του μαθήματος, με λύσεις. Χωρίς βαθμούς ή μονάδες.",
  levels:
    "Φύλλο εργασίας σε 3 επίπεδα για διαφοροποίηση: 5–7 ασκήσεις, καθεμία με την κανονική της εκδοχή και επιπλέον μια απλούστερη (basic) και μια πιο απαιτητική (advanced), όλες με λύσεις.",
  plan: "Σχέδιο μαθήματος 40 λεπτών, με αυτές τις φάσεις: Στόχοι · Αφόρμηση (5′) · Κύρια δραστηριότητα (20′) · Εξάσκηση και διαφοροποίηση (10′) · Κλείσιμο και έλεγχος (5′) · Υλικά.",
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** A free-text request («ένα τεστ για τα κλάσματα») → the closest tile. */
export function inferKind(text: string): PrepKind {
  const t = fold(text);
  if (/τεστ|διαγωνισμ|κουιζ|quiz|αξιολογησ/.test(t)) return "quiz";
  if (/σχεδιο|πλανο|πορεια (του )?μαθηματ/.test(t)) return "plan";
  if (/επιπεδ|διαφοροπ/.test(t)) return "levels";
  return "worksheet";
}

/** Lessons worth preparing for: the current one and the next ones, in order. */
export function upcoming(slots: LessonSlot[], today: ISODate, now: HHMM, n = 8): LessonSlot[] {
  return sortSlots(slots)
    .filter((s) => s.date > today || (s.date === today && timeToMin(s.end) > timeToMin(now)))
    .slice(0, n);
}

/** «Σήμερα 10:05», «Αύριο 08:25», «Πέμπτη 09:25». */
export function whenLabel(slot: Pick<LessonSlot, "date" | "start">, today: ISODate): string {
  if (slot.date === today) return `Σήμερα ${slot.start}`;
  if (slot.date === addDays(today, 1)) return `Αύριο ${slot.start}`;
  return `${dayName(slot.date)} ${slot.start}`;
}

/** The topic of the last lesson before this one, same class and subject: what the new one follows. */
export function previousTopic(slots: LessonSlot[], slot: Pick<LessonSlot, "date" | "start" | "classId" | "subjectId">): string | undefined {
  return sortSlots(slots)
    .filter((s) => s.classId === slot.classId && s.subjectId === slot.subjectId && (s.date < slot.date || (s.date === slot.date && s.start < slot.start)) && s.topic.trim())
    .at(-1)?.topic;
}

export interface PrepInput {
  kind: PrepKind;
  subject: string;
  grade: string;
  topic: string;
  /** Topic of the previous lesson, used when this one has none. */
  previous?: string;
  /** The teacher's own words. */
  text?: string;
  /** A photo of a textbook page goes along. */
  photo?: boolean;
}

/**
 * The request for the model: title of the new material and the instruction.
 * Only lesson details go out: topics and the teacher's request, never pupils or notes.
 */
export function prepRequest({ kind, subject, grade, topic, previous, text, photo }: PrepInput): { title: string; hint: string } {
  const t = topic.trim();
  const base = t || `${subject}${grade ? ` · ${grade.replace(/ Δημοτικού$/, "")}` : ""}`;
  // Three levels become three sheets; each gets «· Επίπεδο Α/Β/Γ» after this title.
  const title = kind === "levels" || (kind === "worksheet" && t) ? base : `${base} · ${PREP[kind].title}`;
  const hint = [
    ASK[kind],
    t ? `Θέμα του μαθήματος: ${t}.` : previous ? `Δεν δόθηκε θέμα· συνέχεια του προηγούμενου μαθήματος («${previous}»).` : "Δεν δόθηκε θέμα· διάλεξε κατάλληλο θέμα της ύλης της τάξης.",
    photo ? "Βασίσου στη φωτογραφημένη σελίδα του βιβλίου: τις ασκήσεις και το θέμα της." : "",
    text?.trim() ? `Ο εκπαιδευτικός ζητά επίσης: ${text.trim().slice(0, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { title: title.slice(0, 200), hint };
}
