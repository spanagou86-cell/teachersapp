"use client";

import { addDays } from "../dates";
import { supabase } from "../supabase/client";
import { isSchoolDay, yearFor, type Country } from "../schoolYear";
import { materialize } from "../timetable";
import type {
  AttendanceRecord,
  Block,
  ClassGroup,
  ClassNote,
  FileMeta,
  LessonSlot,
  Material,
  MaterialVersion,
  Profile,
  Student,
  StudentNote,
  SubjectId,
  Task,
  TimeBlock,
  TimetableEntry,
} from "../types";

/*
 * The only place that talks to the database. Rows are mapped to the same shapes the
 * demo uses (lib/types.ts), so screens don't know where data comes from.
 */

const hhmm = (t: string | null) => (t ?? "").slice(0, 5);

// Row shapes (subset of the generated Supabase types) -----------------------------
interface SlotRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  kind: string;
  class_id: string | null;
  subject_id: string | null;
  topic: string;
  status: string;
  taught_note: string;
  carried_from_id: string | null;
  carried_to_id: string | null;
  template_id: string | null;
}
interface MaterialRow {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  kind: Material["kind"];
  level: Material["level"];
  with_solutions: boolean;
  black_and_white: boolean;
  file: FileMeta | null;
  original_blocks: Block[];
  blocks: Block[];
  created_at: string;
  updated_at: string;
}
interface EntryRow {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  kind: TimetableEntry["kind"];
  class_id: string | null;
  subject_id: string | null;
  label: string;
}

export const toEntry = (r: EntryRow): TimetableEntry => ({
  id: r.id,
  weekday: r.weekday,
  start: hhmm(r.start_time),
  end: hhmm(r.end_time),
  kind: r.kind,
  classId: r.class_id ?? undefined,
  subjectId: (r.subject_id ?? undefined) as SubjectId | undefined,
  label: r.label,
});

export function splitSlots(rows: SlotRow[], links: { slot_id: string; material_id: string }[]): { slots: LessonSlot[]; blocks: TimeBlock[] } {
  const byslot = new Map<string, string[]>();
  for (const l of links) byslot.set(l.slot_id, [...(byslot.get(l.slot_id) ?? []), l.material_id]);
  const slots: LessonSlot[] = [];
  const blocks: TimeBlock[] = [];
  for (const r of rows) {
    if (r.kind === "lesson" && r.class_id && r.subject_id) {
      slots.push({
        id: r.id,
        date: r.date,
        start: hhmm(r.start_time),
        end: hhmm(r.end_time),
        classId: r.class_id,
        subjectId: r.subject_id as SubjectId,
        topic: r.topic,
        materialIds: byslot.get(r.id) ?? [],
        status: r.status as LessonSlot["status"],
        taughtNote: r.taught_note,
        carriedFromId: r.carried_from_id ?? undefined,
        carriedToId: r.carried_to_id ?? undefined,
      });
    } else if (r.kind !== "lesson") {
      blocks.push({ id: r.id, date: r.date, start: hhmm(r.start_time), end: hhmm(r.end_time), kind: r.kind as TimeBlock["kind"], label: r.topic });
    }
  }
  return { slots, blocks };
}

export function toMaterial(r: MaterialRow, versions: MaterialVersion[]): Material {
  return {
    id: r.id,
    title: r.title,
    classId: r.class_id,
    subjectId: r.subject_id as SubjectId,
    kind: r.kind,
    level: r.level,
    withSolutions: r.with_solutions,
    blackAndWhite: r.black_and_white,
    file: r.file ?? undefined,
    originalBlocks: r.original_blocks,
    blocks: r.blocks,
    versions,
    createdAt: Date.parse(r.created_at),
    updatedAt: Date.parse(r.updated_at),
  };
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Supabase returns at most 1000 rows per request; page through bigger tables. */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await page(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export interface CloudData {
  profile: Profile;
  classes: ClassGroup[];
  students: Student[];
  slots: LessonSlot[];
  blocks: TimeBlock[];
  timetable: TimetableEntry[];
  materials: Material[];
  attendance: Record<string, AttendanceRecord>;
  tasks: Task[];
  notes: ClassNote[];
  studentNotes: StudentNote[];
}

/** Everything a teacher needs, in one round of parallel requests. */
export async function loadAll(userId: string, today: string): Promise<CloudData> {
  const db = supabase();
  // The school's feast day is a personal setting kept with the account itself.
  const meta = (await db.auth.getSession()).data.session?.user.user_metadata;
  const from = addDays(today, -120);
  const to = addDays(today, 240);
  const [profile, classes, students, slotRows, links, entries, materials, versions, attendance, tasks, notes, studentNotes, plans] = await Promise.all([
    db.from("profiles").select("display_name, school_name, onboarded, country").eq("id", userId).maybeSingle().then(check),
    db.from("classes").select("id, name, grade, room").order("name").then(check),
    db.from("students").select("id, class_id, first_name, last_name").order("sort").order("first_name").then(check),
    all<SlotRow>((a, b) =>
      db
        .from("lesson_slots")
        .select("id, date, start_time, end_time, kind, class_id, subject_id, topic, status, taught_note, carried_from_id, carried_to_id, template_id")
          .eq("cancelled", false)
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("start_time")
        .range(a, b),
    ),
    all<{ slot_id: string; material_id: string }>((a, b) => db.from("slot_materials").select("slot_id, material_id").range(a, b)),
    db.from("timetable_entries").select("id, weekday, start_time, end_time, kind, class_id, subject_id, label").then(check),
    db.from("materials").select("*").order("updated_at", { ascending: false }).then(check),
    all<{ id: string; material_id: string; label: string; blocks: Block[]; created_at: string }>((a, b) =>
      db.from("material_versions").select("id, material_id, label, blocks, created_at").order("created_at", { ascending: false }).range(a, b),
    ),
    db.from("attendance").select("class_id, date, absent_ids, late_ids, recorded_at").gte("date", from).then(check),
    db.from("tasks").select("id, date, text, done, time, detail").or(`done.eq.false,date.gte.${addDays(today, -7)}`).order("created_at").then(check),
    db.from("class_notes").select("id, class_id, date, text, created_at").order("created_at", { ascending: false }).limit(500).then(check),
    all<{ id: string; student_id: string; kind: StudentNote["kind"]; date: string; text: string; created_at: string }>((a, b) =>
      db.from("student_notes").select("id, student_id, kind, date, text, created_at").order("date", { ascending: false }).range(a, b),
    ),
    plansIn(from, to),
  ]);
  const split = splitSlots(slotRows, links);

  const versionsBy = new Map<string, MaterialVersion[]>();
  for (const v of versions)
    versionsBy.set(v.material_id, [...(versionsBy.get(v.material_id) ?? []), { id: v.id, at: Date.parse(v.created_at), label: v.label, blocks: v.blocks }]);

  return {
    profile: profile
      ? {
          displayName: profile.display_name,
          schoolName: profile.school_name,
          onboarded: profile.onboarded,
          country: profile.country as Country,
          localHoliday: typeof meta?.local_holiday === "string" ? meta.local_holiday : undefined,
        }
      : { displayName: "", schoolName: "", onboarded: false, country: "gr" },
    classes: (classes as { id: string; name: string; grade: string; room: string }[]).map((c) => ({ ...c })),
    students: (students as { id: string; class_id: string; first_name: string; last_name: string }[]).map((s) => ({
      id: s.id,
      classId: s.class_id,
      firstName: s.first_name,
      lastName: s.last_name,
    })),
    slots: withPlans(split.slots, plans),
    blocks: split.blocks,
    timetable: (entries as EntryRow[]).map(toEntry),
    materials: (materials as MaterialRow[]).map((m) => toMaterial(m, versionsBy.get(m.id) ?? [])),
    attendance: Object.fromEntries(
      (attendance as { class_id: string; date: string; absent_ids: string[]; late_ids: string[]; recorded_at: string }[]).map((a) => [
        `${a.class_id}|${a.date}`,
        { absentIds: a.absent_ids, lateIds: a.late_ids, recordedAt: Date.parse(a.recorded_at) },
      ]),
    ),
    tasks: (tasks as { id: string; text: string; done: boolean; time: string | null; detail: string }[]).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      time: t.time ? hhmm(t.time) : undefined,
      detail: t.detail || undefined,
    })),
    notes: (notes as { id: string; class_id: string; date: string; text: string; created_at: string }[]).map((n) => ({
      id: n.id,
      classId: n.class_id,
      date: n.date,
      text: n.text,
      createdAt: Date.parse(n.created_at),
    })),
    studentNotes: studentNotes.map((n) => ({ id: n.id, studentId: n.student_id, kind: n.kind, date: n.date, text: n.text, createdAt: Date.parse(n.created_at) })),
  };
}

// Writes ------------------------------------------------------------------------
const db = () => supabase();

/** False until migration 0007 has added lesson_slots.plan; objectives then stay on this device only. */
let planColumn = true;
export const plansSync = () => planColumn;

/** The weekly-programme objectives of a period. Never fails: an older database simply has none. */
async function plansIn(from: string, to: string): Promise<Map<string, string>> {
  const { data, error } = await supabase().from("lesson_slots").select("id, plan").gte("date", from).lte("date", to).neq("plan", "").limit(5000);
  if (error) {
    planColumn = false;
    return new Map();
  }
  planColumn = true;
  return new Map((data as { id: string; plan: string }[]).map((r) => [r.id, r.plan]));
}
const withPlans = (slots: LessonSlot[], plans: Map<string, string>) => (plans.size ? slots.map((s) => (plans.has(s.id) ? { ...s, plan: plans.get(s.id) } : s)) : slots);
const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
  const { error } = await p;
  if (error) throw new Error(error.message);
};

interface FutureSlot {
  id: string;
  date: string;
  kind: string;
  topic: string;
  status: string;
  taught_note: string;
  carried_from_id: string | null;
  carried_to_id: string | null;
}
const FUTURE_COLS = "id, date, kind, topic, status, taught_note, carried_from_id, carried_to_id";

/** Deletes the given future lessons except those the teacher has already worked on. */
async function deleteUntouched(slots: FutureSlot[]) {
  if (!slots.length) return;
  const linked = new Set((await all<{ slot_id: string }>((a, b) => db().from("slot_materials").select("slot_id").range(a, b))).map((l) => l.slot_id));
  const untouched = slots
    .filter((s) => s.status === "planned" && !s.taught_note && !(s.kind === "lesson" && s.topic) && !s.carried_from_id && !s.carried_to_id && !linked.has(s.id))
    .map((s) => s.id);
  for (let i = 0; i < untouched.length; i += 200) await run(db().from("lesson_slots").delete().in("id", untouched.slice(i, i + 200)));
}

const TABLES = ["profiles", "classes", "students", "timetable_entries", "lesson_slots", "materials", "material_versions", "slot_materials", "attendance", "tasks", "class_notes", "student_notes"] as const;

export const remote = {
  /** Lessons of any period (the app keeps only the months around today in memory). */
  fetchSlots: async (from: string, to: string): Promise<LessonSlot[]> => {
    const [rows, links] = await Promise.all([
      all<SlotRow>((a, b) =>
        db()
          .from("lesson_slots")
          .select("id, date, start_time, end_time, kind, class_id, subject_id, topic, status, taught_note, carried_from_id, carried_to_id, template_id")
          .eq("cancelled", false)
          .eq("kind", "lesson")
          .gte("date", from)
          .lte("date", to)
          .order("date")
          .order("start_time")
          .range(a, b),
      ),
      all<{ slot_id: string; material_id: string }>((a, b) => db().from("slot_materials").select("slot_id, material_id").range(a, b)),
    ]);
    return withPlans(splitSlots(rows, links).slots, await plansIn(from, to));
  },

  /** Everything the teacher has stored, for "Κατέβασε τα δεδομένα μου" (GDPR portability). */
  exportAll: async (): Promise<Record<string, unknown[]>> => {
    const out: Record<string, unknown[]> = {};
    for (const t of TABLES) out[t] = await all<unknown>((a, b) => db().from(t).select("*").range(a, b));
    return out;
  },

  /** Removes the teacher's files, then the account; every database row goes with it (on delete cascade). */
  deleteAccount: async (userId: string) => {
    for (;;) {
      const { data, error } = await db().storage.from("materials").list(userId, { limit: 100 });
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      const { error: rmError } = await db().storage.from("materials").remove(data.map((f) => `${userId}/${f.name}`));
      if (rmError) throw new Error(rmError.message);
      if (data.length < 100) break;
    }
    const { error } = await db().rpc("delete_my_account");
    if (error) throw new Error(error.message);
    await db().auth.signOut();
  },

  updateProfile: async (userId: string, p: Partial<Profile>) => {
    if ("localHoliday" in p) {
      const { error } = await db().auth.updateUser({ data: { local_holiday: p.localHoliday ?? null } });
      if (error) throw new Error(error.message);
    }
    const row = {
      ...(p.displayName !== undefined && { display_name: p.displayName }),
      ...(p.schoolName !== undefined && { school_name: p.schoolName }),
      ...(p.onboarded !== undefined && { onboarded: p.onboarded }),
      ...(p.country !== undefined && { country: p.country }),
    };
    if (Object.keys(row).length) await run(db().from("profiles").update(row).eq("id", userId));
  },

  upsertClass: (c: ClassGroup) => run(db().from("classes").upsert({ id: c.id, name: c.name, grade: c.grade, room: c.room })),
  deleteClass: (id: string) => run(db().from("classes").delete().eq("id", id)),
  insertStudents: (list: Student[], firstSort = 0) =>
    run(
      db()
        .from("students")
        .insert(list.map((s, i) => ({ id: s.id, class_id: s.classId, first_name: s.firstName, last_name: s.lastName, sort: firstSort + i }))),
    ),
  updateStudent: (s: Student) => run(db().from("students").update({ first_name: s.firstName, last_name: s.lastName, class_id: s.classId }).eq("id", s.id)),
  deleteStudent: (id: string) => run(db().from("students").delete().eq("id", id)),

  /** `date` only on creation: the database default is UTC, not Athens. */
  upsertTask: (t: Task, date?: string) =>
    run(db().from("tasks").upsert({ id: t.id, text: t.text, done: t.done, time: t.time ?? null, detail: t.detail ?? "", ...(date && { date }) })),
  deleteTask: (id: string) => run(db().from("tasks").delete().eq("id", id)),

  setAttendance: (classId: string, date: string, r: AttendanceRecord) =>
    run(
      db()
        .from("attendance")
        .upsert(
          { class_id: classId, date, absent_ids: r.absentIds, late_ids: r.lateIds ?? [], recorded_at: new Date(r.recordedAt).toISOString() },
          { onConflict: "owner,class_id,date" },
        ),
    ),

  updateSlot: async (id: string, patch: Partial<Pick<LessonSlot, "status" | "taughtNote" | "topic" | "carriedToId" | "plan">>) => {
    const row = {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.taughtNote !== undefined && { taught_note: patch.taughtNote }),
      ...(patch.topic !== undefined && { topic: patch.topic }),
      ...("carriedToId" in patch && { carried_to_id: patch.carriedToId ?? null }),
      ...(patch.plan !== undefined && planColumn && { plan: patch.plan }),
    };
    if (Object.keys(row).length) await run(db().from("lesson_slots").update(row).eq("id", id));
  },
  /** Many lesson topics at once (a syllabus laid over the year), a few requests at a time. */
  updateTopics: async (patches: { id: string; topic: string }[]) => {
    for (let i = 0; i < patches.length; i += 8)
      await Promise.all(patches.slice(i, i + 8).map((p) => run(db().from("lesson_slots").update({ topic: p.topic }).eq("id", p.id))));
  },
  updatePlans: async (plans: Record<string, string>) => {
    if (!planColumn) return;
    const list = Object.entries(plans);
    for (let i = 0; i < list.length; i += 8)
      await Promise.all(list.slice(i, i + 8).map(([id, plan]) => run(db().from("lesson_slots").update({ plan }).eq("id", id))));
  },
  insertSlot: async (s: LessonSlot) => {
    await run(
      db().from("lesson_slots").insert({
        id: s.id,
        date: s.date,
        start_time: s.start,
        end_time: s.end,
        kind: "lesson",
        class_id: s.classId,
        subject_id: s.subjectId,
        topic: s.topic,
        status: s.status,
        taught_note: s.taughtNote,
        carried_from_id: s.carriedFromId ?? null,
      }),
    );
    if (s.materialIds.length)
      await run(db().from("slot_materials").insert(s.materialIds.map((m) => ({ slot_id: s.id, material_id: m }))));
  },
  deleteSlot: (id: string) => run(db().from("lesson_slots").delete().eq("id", id)),

  /** "Διαγραφή μαθήματος": kept as cancelled, so the timetable never recreates it. */
  cancelSlot: (id: string, cancelled = true) => run(db().from("lesson_slots").update({ cancelled }).eq("id", id)),

  /**
   * Changes a lesson's day, time, class or subject. A lesson that came from the timetable
   * becomes a one-off, and its original place is marked cancelled so it isn't filled again.
   */
  editSlot: async (s: LessonSlot, original: LessonSlot) => {
    const moved = s.date !== original.date || s.start !== original.start;
    const { data, error } = await db().from("lesson_slots").select("template_id").eq("id", s.id).maybeSingle();
    if (error) throw new Error(error.message);
    const template = (data as { template_id: string | null } | null)?.template_id ?? null;
    await run(
      db()
        .from("lesson_slots")
        .update({
          date: s.date,
          start_time: s.start,
          end_time: s.end,
          class_id: s.classId,
          subject_id: s.subjectId,
          ...(moved && template && { template_id: null }),
        })
        .eq("id", s.id),
    );
    if (moved && template)
      await run(
        db().from("lesson_slots").upsert(
          {
            date: original.date,
            start_time: original.start,
            end_time: original.end,
            kind: "lesson",
            class_id: original.classId,
            subject_id: original.subjectId,
            topic: "",
            template_id: template,
            cancelled: true,
          },
          { onConflict: "owner,template_id,date", ignoreDuplicates: true },
        ),
      );
  },
  attach: (slotId: string, materialId: string) =>
    run(db().from("slot_materials").upsert({ slot_id: slotId, material_id: materialId }, { ignoreDuplicates: true })),
  detach: (slotId: string, materialId: string) =>
    run(db().from("slot_materials").delete().eq("slot_id", slotId).eq("material_id", materialId)),

  insertMaterial: async (m: Material) => {
    await run(
      db().from("materials").insert({
        id: m.id,
        title: m.title.slice(0, 200),
        class_id: m.classId,
        subject_id: m.subjectId,
        kind: m.kind,
        level: m.level,
        with_solutions: m.withSolutions,
        black_and_white: m.blackAndWhite,
        file: m.file ?? null,
        original_blocks: m.originalBlocks,
        blocks: m.blocks,
      }),
    );
    await run(db().from("material_versions").insert(m.versions.map((v) => ({ id: v.id, material_id: m.id, label: v.label.slice(0, 200), blocks: v.blocks }))));
  },
  /** Saves the working copy and the newest history entry. */
  saveMaterialChange: async (m: Material) => {
    const v = m.versions[0];
    await run(db().from("materials").update({ blocks: m.blocks }).eq("id", m.id));
    if (v) await run(db().from("material_versions").insert({ id: v.id, material_id: m.id, label: v.label.slice(0, 200), blocks: v.blocks }));
  },
  patchMaterial: (id: string, p: Partial<Pick<Material, "title" | "withSolutions" | "blackAndWhite" | "classId" | "subjectId" | "kind" | "level">>) =>
    run(
      db()
        .from("materials")
        .update({
          ...(p.title !== undefined && { title: p.title }),
          ...(p.withSolutions !== undefined && { with_solutions: p.withSolutions }),
          ...(p.blackAndWhite !== undefined && { black_and_white: p.blackAndWhite }),
          ...(p.classId !== undefined && { class_id: p.classId }),
          ...(p.subjectId !== undefined && { subject_id: p.subjectId }),
          ...(p.kind !== undefined && { kind: p.kind }),
          ...(p.level !== undefined && { level: p.level }),
        })
        .eq("id", id),
    ),
  deleteMaterial: async (m: Material) => {
    await run(db().from("materials").delete().eq("id", m.id));
    if (m.file?.path) await db().storage.from("materials").remove([m.file.path]);
  },

  addNote: (n: ClassNote) => run(db().from("class_notes").insert({ id: n.id, class_id: n.classId, date: n.date, text: n.text })),
  deleteNote: (id: string) => run(db().from("class_notes").delete().eq("id", id)),
  addStudentNote: (n: StudentNote) =>
    run(db().from("student_notes").insert({ id: n.id, student_id: n.studentId, kind: n.kind, date: n.date, text: n.text })),
  deleteStudentNote: (id: string) => run(db().from("student_notes").delete().eq("id", id)),
  editNote: (id: string, text: string) => run(db().from("class_notes").update({ text }).eq("id", id)),
  editStudentNote: (id: string, text: string) => run(db().from("student_notes").update({ text }).eq("id", id)),

  uploadFile: async (userId: string, file: File): Promise<string> => {
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80) || "file";
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await db().storage.from("materials").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(error.message);
    return path;
  },
  signedUrl: async (path: string): Promise<string | undefined> => {
    const { data } = await db().storage.from("materials").createSignedUrl(path, 3600);
    return data?.signedUrl;
  },

  /**
   * Replaces the weekly template. Future lessons that came from removed or changed
   * entries are deleted unless the teacher already touched them (topic, note, status,
   * material or carry-over); then the whole template is expanded to the end of the year.
   */
  saveTimetable: async (entries: TimetableEntry[], previous: TimetableEntry[], today: string, now: string, country: Country) => {
    const same = (a: TimetableEntry, b: TimetableEntry) =>
      a.weekday === b.weekday && a.start === b.start && a.end === b.end && a.kind === b.kind && a.classId === b.classId && a.subjectId === b.subjectId && a.label === b.label;
    const kept = entries.filter((e) => previous.some((p) => p.id === e.id && same(p, e)));
    const removed = previous.filter((p) => !kept.some((k) => k.id === p.id));
    const added = entries.filter((e) => !kept.some((k) => k.id === e.id)).map((e) => ({ ...e, id: crypto.randomUUID() }));

    if (removed.length) {
      const ids = removed.map((r) => r.id);
      const future: FutureSlot[] = [];
      for (let i = 0; i < ids.length; i += 100)
        future.push(...(await all<FutureSlot>((a, b) => db().from("lesson_slots").select(FUTURE_COLS).in("template_id", ids.slice(i, i + 100)).gte("date", today).range(a, b))));
      await deleteUntouched(future);
      await run(db().from("timetable_entries").delete().in("id", ids));
    }
    if (added.length)
      await run(
        db()
          .from("timetable_entries")
          .insert(
            added.map((e) => ({
              id: e.id,
              weekday: e.weekday,
              start_time: e.start,
              end_time: e.end,
              kind: e.kind,
              class_id: e.kind === "lesson" ? e.classId : null,
              subject_id: e.kind === "lesson" ? e.subjectId : null,
              label: e.label,
              valid_from: today,
            })),
          ),
      );
    await remote.fillYear([...kept, ...added], today, now, country);
  },

  /**
   * Makes sure every school day from today to the end of the school year has its lessons.
   * Idempotent: times already taken (by any lesson or block) are left alone, so it is safe
   * to run on every start-up — that is how a new school year gets its calendar.
   */
  fillYear: async (entries: TimetableEntry[], today: string, now: string, country: Country) => {
    if (!entries.length) return 0;
    const year = yearFor(country, today);
    const from = today > year.start ? today : year.start;
    if (from > year.end) return 0;
    const taken = new Set(
      (await all<{ date: string; start_time: string }>((a, b) => db().from("lesson_slots").select("date, start_time").gte("date", from).range(a, b))).map(
        (r) => `${r.date}|${r.start_time.slice(0, 5)}`,
      ),
    );
    const occ = materialize(entries, from, year.end, new Set(), (d) => !isSchoolDay(country, d)).filter(
      (o) => !taken.has(`${o.date}|${o.entry.start}`) && !(o.date === today && o.entry.start < now),
    );
    const rows = occ.map((o) => ({
      date: o.date,
      start_time: o.entry.start,
      end_time: o.entry.end,
      kind: o.entry.kind,
      class_id: o.entry.kind === "lesson" ? o.entry.classId : null,
      subject_id: o.entry.kind === "lesson" ? o.entry.subjectId : null,
      topic: o.entry.kind === "lesson" ? "" : o.entry.label,
      template_id: o.templateId,
    }));
    for (let i = 0; i < rows.length; i += 500)
      await run(db().from("lesson_slots").upsert(rows.slice(i, i + 500), { onConflict: "owner,template_id,date", ignoreDuplicates: true }));
    return rows.length;
  },

  /** After a change of calendar (country, feast day, new rules): drop untouched lessons on days off, add the missing days. */
  applyCalendar: async (entries: TimetableEntry[], today: string, now: string, country: Country) => {
    const future = await all<FutureSlot>((a, b) => db().from("lesson_slots").select(FUTURE_COLS).gte("date", today).range(a, b));
    await deleteUntouched(future.filter((s) => !isSchoolDay(country, s.date)));
    await remote.fillYear(entries, today, now, country);
  },
};
