import { sortSlots } from "./schedule";
import type { ISODate, LessonSlot } from "./types";

/** One topic of a subject's syllabus and how many periods it takes. */
export interface SyllabusItem {
  title: string;
  periods: number;
  /** The unit it belongs to (e.g. «Ενότητα 3: Κλάσματα»). */
  unit?: string;
}

export interface TopicPatch {
  id: string;
  topic: string;
}

/** Lessons of a class and subject that can still take a topic: from a date on, not taught yet, not moved. */
export function openLessons(slots: LessonSlot[], classId: string, subjectId: string, from: ISODate): LessonSlot[] {
  return sortSlots(slots.filter((s) => s.classId === classId && s.subjectId === subjectId && s.date >= from && s.status === "planned" && !s.taughtNote.trim() && !s.carriedToId));
}

/** The topic a lesson shows: the unit's name and the topic, or just the topic. */
export const topicLabel = (it: SyllabusItem) => (it.unit && !it.title.includes(it.unit) ? `${it.unit}: ${it.title}` : it.title).slice(0, 200);

/**
 * Lays the syllabus over the lessons in order: a topic of 3 periods fills the next 3 lessons.
 * Returns the topic of every lesson that gets one, and the topics that didn't fit before the year ends.
 */
export function spread(items: SyllabusItem[], lessons: LessonSlot[]): { patches: TopicPatch[]; left: SyllabusItem[] } {
  const patches: TopicPatch[] = [];
  let i = 0;
  let n = 0;
  for (; n < items.length; n++) {
    const it = items[n];
    const label = topicLabel(it);
    const count = Math.max(1, Math.round(it.periods) || 1);
    if (i >= lessons.length) break;
    for (let k = 0; k < count && i < lessons.length; k++) patches.push({ id: lessons[i++].id, topic: label });
  }
  return { patches, left: items.slice(n) };
}

/**
 * «Δεν έγινε»: the lesson's topic moves to the next lesson of the class and subject, and every
 * following topic one lesson on (Planboard's «bump»). The last topic falls off the year.
 */
export function bump(slots: LessonSlot[], slotId: string): TopicPatch[] {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot?.topic.trim()) return [];
  const after = openLessons(slots, slot.classId, slot.subjectId, slot.date).filter((s) => s.id !== slot.id && (s.date > slot.date || s.start > slot.start));
  const patches: TopicPatch[] = [];
  let carry = slot.topic;
  for (const s of after) {
    if (s.topic === carry) break;
    patches.push({ id: s.id, topic: carry });
    carry = s.topic;
    if (!carry.trim()) break;
  }
  return patches;
}

/**
 * A pasted or typed list → items. One topic per line; a number in brackets or after a dash is
 * the periods («Κλάσματα (3)», «Κλάσματα - 3 περ.»). Lines ending in «:» start a unit.
 */
export function parseList(text: string): SyllabusItem[] {
  const out: SyllabusItem[] = [];
  let unit: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, "").trim();
    if (!line) continue;
    if (line.endsWith(":")) {
      unit = line.slice(0, -1).trim().slice(0, 120);
      continue;
    }
    const m = line.match(/^(.*?)\s*(?:\((\d{1,2})(?:\s*περ\.?|\s*ώρ\S*)?\)|[-–—]\s*(\d{1,2})\s*(?:περ\S*|ώρ\S*)?)\s*$/);
    const title = (m ? m[1] : line).trim().slice(0, 160);
    if (!title) continue;
    out.push({ title, periods: m ? Number(m[2] ?? m[3]) : 1, ...(unit && { unit }) });
  }
  return out;
}

export const totalPeriods = (items: SyllabusItem[]) => items.reduce((n, it) => n + Math.max(1, Math.round(it.periods) || 1), 0);
