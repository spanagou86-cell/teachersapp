"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "@/components/toast";
import { buildBlocks } from "../ai/templates";
import { addDays, DEMO_NOW, DEMO_TODAY } from "../dates";
import { uid } from "../id";
import { applyChange, restoreOriginal, restoreVersion } from "../materials";
import { carryOverLesson, findConflicts, undoCarryOver, type CarryOverResult, type TimeWindow } from "../schedule";
import { seed, type SeedState } from "../seed";
import { CALENDAR_VERSION, isSchoolDay, setLocalHoliday, yearFor } from "../schoolYear";
import { bump, openLessons, spread, type SyllabusItem, type TopicPatch } from "../syllabus";
import { materialize } from "../timetable";
import type {
  Block,
  ClassGroup,
  FileMeta,
  HHMM,
  ISODate,
  LessonSlot,
  Level,
  Material,
  MaterialKind,
  Profile,
  Student,
  StudentNote,
  ClassNote,
  Task,
  SubjectId,
  TimeBlock,
  TimetableEntry,
} from "../types";
import { deleteBlob } from "./blobs";
import { loadAll, remote } from "./remote";

export interface NewMaterialInput {
  title: string;
  classId: string;
  subjectId: SubjectId;
  kind: MaterialKind;
  level: Level;
  withSolutions: boolean;
  file?: FileMeta;
  blocks?: Block[];
}

/**
 * demo  — sample data kept in this browser, fixed demo clock (no account).
 * cloud — the signed-in teacher's data from Supabase, real clock.
 */
export type Mode = "demo" | "cloud";

interface Session {
  mode: Mode | null;
  userId?: string;
  email?: string;
  profile: Profile;
  today: ISODate;
  now: HHMM;
  syncing: boolean;
}

interface Actions {
  startDemo: () => void;
  loadCloud: (userId: string, email?: string) => Promise<void>;
  leave: () => void;
  tick: () => void;
  reset: () => void;

  updateProfile: (p: Partial<Profile>) => void;
  /** Changes country and moves the calendar to its holidays. */
  setCountry: (country: Profile["country"]) => Promise<void>;
  /** The school's feast day ("MM-DD", or nothing): lessons that day are taken off the calendar. */
  setLocalHoliday: (mmdd: string | undefined) => Promise<void>;
  addClass: (c: Omit<ClassGroup, "id">) => string;
  updateClass: (c: ClassGroup) => void;
  deleteClass: (id: string) => void;
  addStudents: (classId: string, names: string[]) => void;
  /** Names already split into first and last (e.g. read from a photo of the class list). */
  addStudentRecords: (classId: string, list: { firstName: string; lastName: string }[]) => void;
  renameStudent: (s: Student) => void;
  /** Removes a pupil; returns the «Αναίρεση» that brings them back (within a few seconds). */
  removeStudent: (id: string) => (() => void) | undefined;
  saveTimetable: (entries: TimetableEntry[]) => Promise<void>;

  toggleTask: (id: string) => void;
  addTask: (text: string) => void;
  removeTask: (id: string) => void;
  editTask: (id: string, text: string) => void;
  /** Puts back something just deleted (the "Αναίρεση" of a toast). */
  restoreTask: (t: Task) => void;
  restoreNote: (n: ClassNote) => void;
  restoreStudentNote: (n: StudentNote) => void;
  editNote: (id: string, text: string) => void;
  editStudentNote: (id: string, text: string) => void;

  /** Present → absent → late → present. */
  cycleAttendance: (classId: string, date: string, studentId: string) => void;
  addStudentNote: (studentId: string, kind: StudentNote["kind"], text: string) => void;
  deleteStudentNote: (id: string) => void;
  markAllPresent: (classId: string, date: string) => void;

  updateSlot: (id: string, patch: Partial<Pick<LessonSlot, "status" | "taughtNote" | "topic" | "plan">>) => void;
  /** Day, time, class or subject of one lesson. Refuses times already taken. */
  editSlot: (id: string, patch: Pick<LessonSlot, "date" | "start" | "end" | "classId" | "subjectId">) => { ok: true } | { ok: false; conflicts: TimeWindow[] };
  /** Removes one lesson; returns it so "Αναίρεση" can bring it back. */
  deleteSlot: (id: string) => LessonSlot | undefined;
  restoreSlot: (slot: LessonSlot) => void;
  /** A one-off lesson outside the timetable (e.g. an extra hour). */
  addSlot: (input: Pick<LessonSlot, "date" | "start" | "end" | "classId" | "subjectId" | "topic">) => { ok: true; id: string } | { ok: false; conflicts: TimeWindow[] };
  attachMaterial: (slotId: string, materialId: string) => void;
  detachMaterial: (slotId: string, materialId: string) => void;
  carryOver: (slotId: string, target: TimeWindow) => CarryOverResult;
  /** Writes many lesson topics; returns the «Αναίρεση» that puts the old ones back. */
  setTopics: (patches: TopicPatch[]) => () => void;
  /** A duty for one day only (a swap or a replacement); returns its id. */
  addBlock: (b: Omit<TimeBlock, "id" | "oneOff">) => string;
  /** Takes a duty off one day (kept as cancelled so the timetable doesn't bring it back); returns an undo. */
  removeBlock: (id: string) => () => void;
  /** Objectives of many lessons at once (weekly programme); returns an undo. */
  setPlans: (plans: Record<string, string>) => () => void;
  /**
   * Lays a syllabus over the class's lessons of a subject, from a date to the end of the year
   * (in an account, also lessons not loaded yet). Returns how far it reached.
   */
  spreadSyllabus: (classId: string, subjectId: string, items: SyllabusItem[], from: ISODate) => Promise<{ count: number; until?: ISODate; left: number; undo: () => void }>;
  /** «Δεν έγινε»: the lesson's topic and the ones after it move one lesson on. */
  bumpTopics: (slotId: string) => (() => void) | undefined;
  undoCarryOver: (newSlotId: string) => void;

  createMaterial: (input: NewMaterialInput) => string;
  changeBlocks: (id: string, blocks: Block[], label: string) => void;
  restoreVersion: (id: string, versionId: string) => void;
  restoreOriginal: (id: string) => void;
  patchMaterial: (id: string, patch: Partial<Pick<Material, "title" | "withSolutions" | "blackAndWhite" | "classId" | "subjectId" | "kind" | "level">>) => void;
  duplicateMaterial: (id: string, blocks: Block[], suffix: string) => string;
  /** Deletes a material; returns the «Αναίρεση» that brings it back (within a few seconds). */
  deleteMaterial: (id: string) => (() => void) | undefined;

  addNote: (classId: string, text: string) => void;
  deleteNote: (id: string) => void;
}

export type AppState = SeedState & Session & Actions;

const attendanceKey = (classId: string, date: string) => `${classId}|${date}`;

/** Wall clock in Greece, independent of the device's time zone. */
export function athensClock(d = new Date()): { today: ISODate; now: HHMM } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Athens",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { today: `${parts.year}-${parts.month}-${parts.day}`, now: `${parts.hour}:${parts.minute}` };
}

const EMPTY: SeedState = {
  classes: [],
  students: [],
  slots: [],
  materials: [],
  attendance: {},
  tasks: [],
  notes: [],
  timetable: [],
  blocks: [],
  studentNotes: [],
};

const DEMO_PROFILE: Profile = { displayName: "Σπύρος", schoolName: "3ο Δημοτικό Σχολείο Πάτρας", onboarded: true, country: "gr" };

const noteTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** How long «Αναίρεση» can bring back something deleted. */
const UNDO_MS = 8000;

/** Resolves when every queued database write has finished. */
export let flushWrites: () => Promise<unknown> = () => Promise.resolve();

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** In cloud mode, mirror a local change to the database; on failure, reload the truth. */
      // Writes run one after another, in the order the teacher made them
      // (a class must exist before its students, a lesson before its links).
      let queue: Promise<unknown> = Promise.resolve();
      let pending = 0;
      const sync = (write: () => Promise<unknown>) => {
        if (get().mode !== "cloud") return;
        pending++;
        set({ syncing: true });
        // A dropped connection shouldn't lose work: try again a couple of times before telling the teacher.
        const attempt = async () => {
          for (let i = 0; ; i++) {
            try {
              return await write();
            } catch (err) {
              if (i >= 2 || get().mode !== "cloud") throw err;
              await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
            }
          }
        };
        queue = queue
          .then(attempt)
          .catch((err) => {
            console.error(err);
            toast("Δεν αποθηκεύτηκε. Έλεγξε τη σύνδεση.", { label: "Ανανέωση", run: () => void reload() });
          })
          .finally(() => {
            if (--pending === 0) set({ syncing: false });
          });
      };
      // Deletions reach the database a few seconds late, so «Αναίρεση» can still bring things back.
      const deferred = new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>();
      const later = (key: string, cloud: () => Promise<unknown>, local?: () => unknown) => {
        const run = () => (get().mode === "cloud" ? sync(cloud) : void local?.());
        deferred.set(key, {
          run,
          timer: setTimeout(() => {
            deferred.delete(key);
            run();
          }, UNDO_MS),
        });
      };
      /** False when the write already went out (too late to undo). */
      const cancel = (key: string) => {
        const d = deferred.get(key);
        if (d) clearTimeout(d.timer);
        return deferred.delete(key);
      };
      flushWrites = () => {
        for (const [key, d] of deferred) {
          clearTimeout(d.timer);
          deferred.delete(key);
          d.run();
        }
        // Notes still waiting for a pause in typing go out now.
        for (const [key, timer] of noteTimers) {
          clearTimeout(timer);
          noteTimers.delete(key);
          const [id, field] = key.split("|") as [string, "taughtNote" | "plan"];
          const slot = get().slots.find((x) => x.id === id);
          if (slot) sync(() => remote.updateSlot(id, { [field]: slot[field] ?? "" }));
        }
        return queue;
      };
      if (typeof window !== "undefined")
        window.addEventListener("beforeunload", (e) => {
          if (pending > 0 || noteTimers.size > 0 || deferred.size > 0) {
            void flushWrites();
            e.preventDefault();
          }
        });
      const reload = async () => {
        const { userId, email } = get();
        if (userId) await get().loadCloud(userId, email);
      };
      /** A new country or feast day: lessons on the new days off go, unless the teacher already worked on them. */
      const changeCalendar = async (p: Pick<Profile, "country"> | Pick<Profile, "localHoliday">) => {
        const { mode, today, now, timetable } = get();
        set((s) => ({ profile: { ...s.profile, ...p } }));
        setLocalHoliday(get().profile.localHoliday);
        const country = get().profile.country;
        if (mode === "cloud") {
          await flushWrites();
          set({ syncing: true });
          try {
            await remote.updateProfile(get().userId!, p);
            await remote.applyCalendar(timetable, today, now, country);
          } finally {
            await reload().catch(() => undefined);
            set({ syncing: false });
          }
          return;
        }
        const untouched = (x: LessonSlot) => x.status === "planned" && !x.taughtNote && !x.topic && !x.materialIds.length && !x.carriedFromId && !x.carriedToId;
        set((s) => ({
          slots: s.slots.filter((x) => x.date < today || isSchoolDay(country, x.date) || !untouched(x)),
          blocks: s.blocks.filter((b) => b.date < today || isSchoolDay(country, b.date)),
        }));
      };

      return {
        ...seed(),
        mode: null,
        profile: DEMO_PROFILE,
        today: DEMO_TODAY,
        now: DEMO_NOW,
        syncing: false,

        startDemo: () =>
          set({ ...seed(), mode: "demo", userId: undefined, email: undefined, today: DEMO_TODAY, now: DEMO_NOW, profile: DEMO_PROFILE }),
        loadCloud: async (userId, email) => {
          const clock = athensClock();
          let data = await loadAll(userId, clock.today);
          setLocalHoliday(data.profile.localHoliday);
          if (data.timetable.length) {
            // The calendar rules changed since this device last looked (a fixed holiday list,
            // a new feast day): take untouched lessons off the new days off and fill the rest.
            const key = `taxi-calendar:${userId}`;
            const sig = `${CALENDAR_VERSION}:${data.profile.country}:${data.profile.localHoliday ?? ""}`;
            let stored: string | null = null;
            try {
              stored = localStorage.getItem(key);
            } catch {}
            if (stored !== sig) {
              await remote.applyCalendar(data.timetable, clock.today, clock.now, data.profile.country);
              try {
                localStorage.setItem(key, sig);
              } catch {}
              data = await loadAll(userId, clock.today);
            }
            // A new school year (or days missing after an interruption): fill the calendar from the template.
            else if ((await remote.fillYear(data.timetable, clock.today, clock.now, data.profile.country)) > 0) data = await loadAll(userId, clock.today);
          }
          set({ ...data, mode: "cloud", userId, email, ...clock });
        },
        leave: () => set({ ...seed(), mode: null, userId: undefined, email: undefined, today: DEMO_TODAY, now: DEMO_NOW, profile: DEMO_PROFILE }),
        tick: () => {
          if (get().mode === "cloud") set(athensClock());
        },
        reset: () => {
          if (get().mode === "demo") set(seed());
        },

        setCountry: async (country) => {
          if (country === get().profile.country) return;
          await changeCalendar({ country });
        },
        setLocalHoliday: async (mmdd) => {
          if (mmdd === get().profile.localHoliday) return;
          await changeCalendar({ localHoliday: mmdd });
        },
        updateProfile: (p) => {
          set((s) => ({ profile: { ...s.profile, ...p } }));
          sync(() => remote.updateProfile(get().userId!, p));
        },
        addClass: (c) => {
          const cls = { ...c, id: uid() };
          set((s) => ({ classes: [...s.classes, cls] }));
          sync(() => remote.upsertClass(cls));
          return cls.id;
        },
        updateClass: (c) => {
          set((s) => ({ classes: s.classes.map((x) => (x.id === c.id ? c : x)) }));
          sync(() => remote.upsertClass(c));
        },
        deleteClass: (id) => {
          set((s) => ({
            classes: s.classes.filter((c) => c.id !== id),
            students: s.students.filter((x) => x.classId !== id),
            slots: s.slots.filter((x) => x.classId !== id),
            materials: s.materials.filter((x) => x.classId !== id),
            timetable: s.timetable.filter((x) => x.classId !== id),
          }));
          sync(() => remote.deleteClass(id));
        },
        addStudents: (classId, names) => {
          const list: Student[] = names
            .map((n) => n.trim().replace(/\s+/g, " "))
            .filter(Boolean)
            .map((n) => {
              const [first, ...rest] = n.split(" ");
              return { id: uid(), classId, firstName: first.slice(0, 60), lastName: rest.join(" ").slice(0, 60) };
            });
          if (!list.length) return;
          const firstSort = get().students.filter((x) => x.classId === classId).length;
          set((s) => ({ students: [...s.students, ...list] }));
          sync(() => remote.insertStudents(list, firstSort));
        },
        addStudentRecords: (classId, records) => {
          const list: Student[] = records
            .filter((r) => r.firstName.trim())
            .map((r) => ({ id: uid(), classId, firstName: r.firstName.trim().slice(0, 60), lastName: r.lastName.trim().slice(0, 60) }));
          if (!list.length) return;
          const firstSort = get().students.filter((x) => x.classId === classId).length;
          set((s) => ({ students: [...s.students, ...list] }));
          sync(() => remote.insertStudents(list, firstSort));
        },
        renameStudent: (st) => {
          set((s) => ({ students: s.students.map((x) => (x.id === st.id ? st : x)) }));
          sync(() => remote.updateStudent(st));
        },
        removeStudent: (id) => {
          const at = get().students.findIndex((x) => x.id === id);
          if (at < 0) return undefined;
          const student = get().students[at];
          set((s) => ({ students: s.students.filter((x) => x.id !== id) }));
          const key = `student:${id}`;
          later(key, () => remote.deleteStudent(id));
          return () => {
            if (!cancel(key)) return;
            set((s) => ({ students: s.students.some((x) => x.id === id) ? s.students : [...s.students.slice(0, at), student, ...s.students.slice(at)] }));
          };
        },
        saveTimetable: async (entries) => {
          const { mode, today, now, timetable: previous } = get();
          if (mode === "cloud") {
            await flushWrites();
            set({ syncing: true });
            try {
              await remote.saveTimetable(entries, previous, today, now, get().profile.country);
              await remote.updateProfile(get().userId!, { onboarded: true });
            } finally {
              // Always re-read: after a partial failure the next attempt must diff against what is really stored.
              await reload().catch(() => undefined);
              set({ syncing: false });
            }
            return;
          }
          // Demo: rebuild the coming three weeks locally from the new template.
          const keep = (s: LessonSlot) => s.date < today || s.status !== "planned" || s.taughtNote || s.topic || s.materialIds.length || s.carriedFromId || s.carriedToId;
          const country = get().profile.country;
          const occ = materialize(entries, today, addDays(today, 20), new Set(), (d) => !isSchoolDay(country, d));
          set((s) => ({
            timetable: entries,
            slots: [
              ...s.slots.filter(keep),
              ...occ
                .filter((o) => o.entry.kind === "lesson" && !s.slots.some((x) => keep(x) && x.date === o.date && x.start === o.entry.start))
                .map((o) => ({
                  id: uid(),
                  date: o.date,
                  start: o.entry.start,
                  end: o.entry.end,
                  classId: o.entry.classId!,
                  subjectId: o.entry.subjectId!,
                  topic: "",
                  materialIds: [],
                  status: "planned" as const,
                  taughtNote: "",
                })),
            ],
            blocks: [
              ...s.blocks.filter((b) => b.date < today || b.oneOff),
              ...occ
                .filter((o) => o.entry.kind !== "lesson")
                .map((o): TimeBlock => ({ id: uid(), date: o.date, start: o.entry.start, end: o.entry.end, kind: o.entry.kind as TimeBlock["kind"], label: o.entry.label })),
            ],
          }));
        },

        toggleTask: (id) => {
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
          const t = get().tasks.find((x) => x.id === id);
          if (t) sync(() => remote.upsertTask(t));
        },
        addTask: (text) => {
          const t = { id: uid(), text: text.slice(0, 200), done: false };
          set((s) => ({ tasks: [...s.tasks, t] }));
          const date = get().today;
          sync(() => remote.upsertTask(t, date));
        },
        removeTask: (id) => {
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
          sync(() => remote.deleteTask(id));
        },
        editTask: (id, text) => {
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, text: text.slice(0, 200) } : t)) }));
          const t = get().tasks.find((x) => x.id === id);
          if (t) sync(() => remote.upsertTask(t));
        },
        restoreTask: (t) => {
          set((s) => ({ tasks: [...s.tasks, t] }));
          const date = get().today;
          sync(() => remote.upsertTask(t, date));
        },
        restoreNote: (n) => {
          set((s) => ({ notes: [n, ...s.notes].sort((a, b) => b.createdAt - a.createdAt) }));
          sync(() => remote.addNote(n));
        },
        restoreStudentNote: (n) => {
          set((s) => ({ studentNotes: [n, ...s.studentNotes].sort((a, b) => b.createdAt - a.createdAt) }));
          sync(() => remote.addStudentNote(n));
        },
        editNote: (id, text) => {
          set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, text: text.slice(0, 2000) } : n)) }));
          sync(() => remote.editNote(id, text.slice(0, 2000)));
        },
        editStudentNote: (id, text) => {
          set((s) => ({ studentNotes: s.studentNotes.map((n) => (n.id === id ? { ...n, text: text.slice(0, 2000) } : n)) }));
          sync(() => remote.editStudentNote(id, text.slice(0, 2000)));
        },

        cycleAttendance: (classId, date, studentId) => {
          const key = attendanceKey(classId, date);
          const cur = get().attendance[key];
          const absent = cur?.absentIds ?? [];
          const late = cur?.lateIds ?? [];
          const record = absent.includes(studentId)
            ? { absentIds: absent.filter((x) => x !== studentId), lateIds: [...late, studentId], recordedAt: Date.now() }
            : late.includes(studentId)
              ? { absentIds: absent, lateIds: late.filter((x) => x !== studentId), recordedAt: Date.now() }
              : { absentIds: [...absent, studentId], lateIds: late, recordedAt: Date.now() };
          set((s) => ({ attendance: { ...s.attendance, [key]: record } }));
          sync(() => remote.setAttendance(classId, date, record));
        },
        addStudentNote: (studentId, kind, text) => {
          const n: StudentNote = { id: uid(), studentId, kind, date: get().today, text: text.slice(0, 2000), createdAt: Date.now() };
          set((s) => ({ studentNotes: [n, ...s.studentNotes] }));
          sync(() => remote.addStudentNote(n));
        },
        deleteStudentNote: (id) => {
          set((s) => ({ studentNotes: s.studentNotes.filter((n) => n.id !== id) }));
          sync(() => remote.deleteStudentNote(id));
        },
        markAllPresent: (classId, date) => {
          const record = { absentIds: [], lateIds: [], recordedAt: Date.now() };
          set((s) => ({ attendance: { ...s.attendance, [attendanceKey(classId, date)]: record } }));
          sync(() => remote.setAttendance(classId, date, record));
        },

        updateSlot: (id, patch) => {
          set((s) => ({ slots: s.slots.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          const typed = Object.keys(patch).length === 1 && (patch.taughtNote !== undefined ? "taughtNote" : patch.plan !== undefined ? "plan" : undefined);
          if (typed) {
            // Text is saved as the teacher types; wait for a pause.
            const key = `${id}|${typed}`;
            clearTimeout(noteTimers.get(key));
            noteTimers.set(
              key,
              setTimeout(() => {
                noteTimers.delete(key);
                const slot = get().slots.find((x) => x.id === id);
                if (slot) sync(() => remote.updateSlot(id, { [typed]: slot[typed] ?? "" }));
              }, 700),
            );
            return;
          }
          sync(() => remote.updateSlot(id, patch));
        },
        attachMaterial: (slotId, materialId) => {
          if (get().slots.find((x) => x.id === slotId)?.materialIds.includes(materialId)) return;
          set((s) => ({ slots: s.slots.map((x) => (x.id === slotId ? { ...x, materialIds: [...x.materialIds, materialId] } : x)) }));
          sync(() => remote.attach(slotId, materialId));
        },
        detachMaterial: (slotId, materialId) => {
          set((s) => ({ slots: s.slots.map((x) => (x.id === slotId ? { ...x, materialIds: x.materialIds.filter((m) => m !== materialId) } : x)) }));
          sync(() => remote.detach(slotId, materialId));
        },
        editSlot: (id, patch) => {
          const { slots, blocks } = get();
          const original = slots.find((x) => x.id === id);
          if (!original) return { ok: false, conflicts: [] };
          const busy = [...slots.filter((x) => x.id !== id), ...blocks.filter((b) => b.kind !== "free")];
          const conflicts = findConflicts(busy, { date: patch.date, start: patch.start, end: patch.end });
          if (conflicts.length) return { ok: false, conflicts };
          const next = { ...original, ...patch };
          set((s) => ({ slots: s.slots.map((x) => (x.id === id ? next : x)) }));
          sync(() => remote.editSlot(next, original));
          return { ok: true };
        },
        deleteSlot: (id) => {
          const slot = get().slots.find((x) => x.id === id);
          if (!slot) return undefined;
          set((s) => ({
            slots: s.slots
              .filter((x) => x.id !== id)
              // A deleted continuation frees the lesson it continued.
              .map((x) => (x.id === slot.carriedFromId ? { ...x, carriedToId: undefined } : x)),
          }));
          sync(async () => {
            await remote.cancelSlot(id);
            if (slot.carriedFromId) await remote.updateSlot(slot.carriedFromId, { carriedToId: undefined });
          });
          return slot;
        },
        restoreSlot: (slot) => {
          set((s) => ({
            slots: [...s.slots.filter((x) => x.id !== slot.id), slot].map((x) => (x.id === slot.carriedFromId ? { ...x, carriedToId: slot.id } : x)),
          }));
          sync(async () => {
            await remote.cancelSlot(slot.id, false);
            if (slot.carriedFromId) await remote.updateSlot(slot.carriedFromId, { carriedToId: slot.id });
          });
        },
        addSlot: (input) => {
          const { slots, blocks } = get();
          const conflicts = findConflicts([...slots, ...blocks.filter((b) => b.kind !== "free")], input);
          if (conflicts.length) return { ok: false, conflicts };
          const slot: LessonSlot = { ...input, id: uid(), materialIds: [], status: "planned", taughtNote: "" };
          set((s) => ({ slots: [...s.slots, slot] }));
          sync(() => remote.insertSlot(slot));
          return { ok: true, id: slot.id };
        },
        setTopics: (patches) => {
          const before = new Map<string, string>();
          for (const p of patches) before.set(p.id, get().slots.find((x) => x.id === p.id)?.topic ?? "");
          const apply = (list: TopicPatch[]) => {
            const by = new Map(list.map((p) => [p.id, p.topic]));
            set((s) => ({ slots: s.slots.map((x) => (by.has(x.id) ? { ...x, topic: by.get(x.id)! } : x)) }));
            sync(() => remote.updateTopics(list));
          };
          apply(patches);
          return () => apply(patches.filter((p) => before.has(p.id)).map((p) => ({ id: p.id, topic: before.get(p.id)! })));
        },
        addBlock: (input) => {
          const block: TimeBlock = { ...input, id: uid(), oneOff: true };
          set((s) => ({ blocks: [...s.blocks, block] }));
          sync(() => remote.insertBlock(block));
          return block.id;
        },
        removeBlock: (id) => {
          const block = get().blocks.find((b) => b.id === id);
          if (!block) return () => undefined;
          set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }));
          sync(() => remote.cancelSlot(id));
          return () => {
            set((s) => ({ blocks: [...s.blocks, block] }));
            sync(() => remote.cancelSlot(id, false));
          };
        },
        setPlans: (plans) => {
          const before: Record<string, string> = {};
          for (const id of Object.keys(plans)) before[id] = get().slots.find((x) => x.id === id)?.plan ?? "";
          const apply = (by: Record<string, string>) => {
            set((s) => ({ slots: s.slots.map((x) => (x.id in by ? { ...x, plan: by[x.id] } : x)) }));
            sync(() => remote.updatePlans(by));
          };
          apply(plans);
          return () => apply(before);
        },
        spreadSyllabus: async (classId, subjectId, items, from) => {
          const { mode, slots, profile } = get();
          let pool = slots;
          let previous = new Map(slots.map((s) => [s.id, s.topic]));
          if (mode === "cloud") {
            // The app keeps a few months in memory; the syllabus runs to June.
            await flushWrites();
            const far = await remote.fetchSlots(from, yearFor(profile.country, from).end);
            const local = new Map(slots.map((s) => [s.id, s]));
            pool = [...far.map((s) => local.get(s.id) ?? s), ...slots.filter((s) => s.date < from)];
            previous = new Map(pool.map((s) => [s.id, s.topic]));
          }
          const lessons = openLessons(pool, classId, subjectId, from);
          const { patches, left } = spread(items, lessons);
          const until = lessons.find((s) => s.id === patches.at(-1)?.id)?.date;
          const write = (list: TopicPatch[]) => {
            const by = new Map(list.map((p) => [p.id, p.topic]));
            set((s) => ({ slots: s.slots.map((x) => (by.has(x.id) ? { ...x, topic: by.get(x.id)! } : x)) }));
            sync(() => remote.updateTopics(list));
          };
          write(patches);
          return { count: patches.length, until, left: left.length, undo: () => write(patches.map((p) => ({ id: p.id, topic: previous.get(p.id) ?? "" }))) };
        },
        bumpTopics: (slotId) => {
          const patches = bump(get().slots, slotId);
          if (!patches.length) return undefined;
          return get().setTopics(patches);
        },
        carryOver: (slotId, target) => {
          const { slots, blocks, today } = get();
          const busy = blocks.filter((b) => b.kind !== "free");
          const result = carryOverLesson(slots, slotId, target, uid(), today, busy);
          if (result.ok) {
            set({ slots: result.slots });
            const original = result.slots.find((s) => s.id === slotId)!;
            sync(async () => {
              await remote.insertSlot(result.newSlot);
              await remote.updateSlot(slotId, { status: original.status, carriedToId: result.newSlot.id });
            });
          }
          return result;
        },
        undoCarryOver: (newSlotId) => {
          const moved = get().slots.find((s) => s.id === newSlotId);
          set((s) => ({ slots: undoCarryOver(s.slots, newSlotId) }));
          if (moved?.carriedFromId) {
            const from = moved.carriedFromId;
            sync(async () => {
              await remote.updateSlot(from, { carriedToId: undefined });
              await remote.deleteSlot(newSlotId);
            });
          }
        },

        createMaterial: (input) => {
          const id = uid();
          const now = Date.now();
          const cls = get().classes.find((c) => c.id === input.classId);
          const blocks =
            input.blocks ??
            buildBlocks({
              subjectId: input.subjectId,
              kind: input.kind,
              level: input.level,
              grade: cls?.grade ?? "",
              hint: `${input.title} ${input.file?.name ?? ""}`,
              prefix: id.slice(0, 8),
            });
          const material: Material = {
            id,
            title: input.title.trim().slice(0, 200) || "Νέο υλικό",
            classId: input.classId,
            subjectId: input.subjectId,
            kind: input.kind,
            level: input.level,
            withSolutions: input.withSolutions,
            blackAndWhite: false,
            file: input.file,
            originalBlocks: blocks,
            blocks,
            versions: [{ id: uid(), at: now, label: input.file ? "Δημιουργία από αρχείο" : "Δημιουργία", blocks }],
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ materials: [material, ...s.materials] }));
          sync(() => remote.insertMaterial(material));
          return id;
        },
        changeBlocks: (id, blocks, label) => {
          set((s) => ({ materials: s.materials.map((m) => (m.id === id ? applyChange(m, blocks, label, uid(), Date.now()) : m)) }));
          const m = get().materials.find((x) => x.id === id);
          if (m) sync(() => remote.saveMaterialChange(m));
        },
        restoreVersion: (id, versionId) => {
          set((s) => ({ materials: s.materials.map((m) => (m.id === id ? restoreVersion(m, versionId, uid(), Date.now()) : m)) }));
          const m = get().materials.find((x) => x.id === id);
          if (m) sync(() => remote.saveMaterialChange(m));
        },
        restoreOriginal: (id) => {
          set((s) => ({ materials: s.materials.map((m) => (m.id === id ? restoreOriginal(m, uid(), Date.now()) : m)) }));
          const m = get().materials.find((x) => x.id === id);
          if (m) sync(() => remote.saveMaterialChange(m));
        },
        patchMaterial: (id, patch) => {
          set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)) }));
          sync(() => remote.patchMaterial(id, patch));
        },
        duplicateMaterial: (id, blocks, suffix) => {
          const src = get().materials.find((m) => m.id === id);
          if (!src) return id;
          const newId = uid();
          const now = Date.now();
          const copy: Material = {
            ...src,
            id: newId,
            title: `${src.title.slice(0, 200 - suffix.length - 1)} ${suffix}`,
            blocks,
            originalBlocks: blocks,
            versions: [{ id: uid(), at: now, label: `Αντίγραφο από «${src.title}»`.slice(0, 200), blocks }],
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ materials: [copy, ...s.materials] }));
          sync(() => remote.insertMaterial(copy));
          return newId;
        },
        deleteMaterial: (id) => {
          const at = get().materials.findIndex((x) => x.id === id);
          if (at < 0) return undefined;
          const m = get().materials[at];
          const linked = new Set(get().slots.filter((x) => x.materialIds.includes(id)).map((x) => x.id));
          const shared = get().materials.some((x) => x.id !== id && x.file && (x.file.blobKey ?? x.file.path) === (m.file?.blobKey ?? m.file?.path));
          set((s) => ({
            materials: s.materials.filter((x) => x.id !== id),
            slots: s.slots.map((x) => (linked.has(x.id) ? { ...x, materialIds: x.materialIds.filter((mid) => mid !== id) } : x)),
          }));
          const key = `material:${id}`;
          later(
            key,
            // A copy (second version) shares the uploaded file; keep it while another material uses it.
            () => remote.deleteMaterial(shared ? { ...m, file: undefined } : m),
            () => m.file?.blobKey && !shared && deleteBlob(m.file.blobKey),
          );
          return () => {
            if (!cancel(key)) return;
            set((s) => ({
              materials: s.materials.some((x) => x.id === id) ? s.materials : [...s.materials.slice(0, at), m, ...s.materials.slice(at)],
              slots: s.slots.map((x) => (linked.has(x.id) && !x.materialIds.includes(id) ? { ...x, materialIds: [...x.materialIds, id] } : x)),
            }));
          };
        },

        addNote: (classId, text) => {
          const n = { id: uid(), classId, date: get().today, text: text.slice(0, 2000), createdAt: Date.now() };
          set((s) => ({ notes: [n, ...s.notes] }));
          sync(() => remote.addNote(n));
        },
        deleteNote: (id) => {
          set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
          sync(() => remote.deleteNote(id));
        },
      };
    },
    {
      name: "taxi-demo",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Only the demo lives in the browser; a teacher's real data stays in the database.
      partialize: (s) =>
        s.mode === "demo"
          ? { mode: s.mode, profile: s.profile, studentNotes: s.studentNotes, slots: s.slots, blocks: s.blocks, timetable: s.timetable, materials: s.materials, attendance: s.attendance, tasks: s.tasks, notes: s.notes, classes: s.classes, students: s.students }
          : { mode: null },
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        // v1 had no modes: anyone with saved data was using the demo.
        if (version < 2) return { ...p, mode: p.slots ? "demo" : null } as AppState;
        return p as AppState;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        if (p.mode !== "demo") return { ...current, ...EMPTY, mode: null };
        const s = seed();
        // Older saves don't have the timetable fields.
        return { ...current, ...p, profile: { ...DEMO_PROFILE, ...p.profile }, studentNotes: p.studentNotes ?? s.studentNotes, timetable: p.timetable ?? s.timetable, blocks: p.blocks ?? s.blocks, classes: p.classes ?? s.classes, students: p.students ?? s.students };
      },
    },
  ),
);

// The calendar follows the teacher's feast day wherever the profile comes from (saved demo, account).
setLocalHoliday(useApp.getState().profile.localHoliday);
useApp.subscribe((s) => setLocalHoliday(s.profile.localHoliday));

export const attendanceFor = (s: AppState, classId: string, date: string) => s.attendance[attendanceKey(classId, date)];
