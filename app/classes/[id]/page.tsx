"use client";

import clsx from "clsx";
import { BookOpenCheck, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Info, NotebookPen, Pencil, Plus, Trash2, Users } from "@/components/icons";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ClassSheet } from "@/components/classes";
import { StatusPill } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { toast } from "@/components/toast";
import { Avatar, Button, ButtonLink, Card, cx, EmptyState, inputClass, Segmented } from "@/components/ui";
import { addDays, dayName, isISODate, longDate, shortDate, weekday } from "@/lib/dates";
import { sortSlots } from "@/lib/schedule";
import { holidayOn } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { ClassGroup, Student } from "@/lib/types";
import { AutoText } from "@/components/text";
import { openSyllabus } from "@/components/syllabus";

type Tab = "attendance" | "students" | "progress" | "notes";

function prevSchoolDay(d: string, dir: -1 | 1): string {
  let x = addDays(d, dir);
  while (weekday(x) === 0 || weekday(x) === 6) x = addDays(x, dir);
  return x;
}

function initials(st: Student) {
  return `${st.firstName[0] ?? ""}${st.lastName[0] ?? ""}`.toUpperCase();
}

function Attendance({ cls, roster }: { cls: ClassGroup; roster: Student[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const today = useApp((s) => s.today);
  const country = useApp((s) => s.profile.country);
  const rawDate = params.get("date");
  const date = isISODate(rawDate) ? rawDate : today;
  const record = useApp((s) => s.attendance[`${cls.id}|${date}`]);
  const cycle = useApp((s) => s.cycleAttendance);
  const allPresent = useApp((s) => s.markAllPresent);
  const absent = record?.absentIds ?? [];
  const late = record?.lateIds ?? [];
  const go = (d: string) => router.replace(`/classes/${cls.id}?date=${d}`, { scroll: false });
  const recordedAt = record ? new Date(record.recordedAt) : undefined;
  const holiday = holidayOn(country, date);

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-2">
        <button type="button" aria-label="Προηγούμενη μέρα" onClick={() => go(prevSchoolDay(date, -1))} className="flex size-10 items-center justify-center rounded-lg hover:bg-line-2">
          <ChevronLeft className="size-5" />
        </button>
        <span className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5" />
          {date === today ? "Σήμερα" : dayName(date)} · {longDate(date).split(", ")[1]}
        </span>
        <button
          type="button"
          aria-label="Επόμενη μέρα"
          disabled={date >= today}
          onClick={() => go(prevSchoolDay(date, 1))}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-line-2 disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </Card>
      {holiday && <p className="rounded-xl bg-line-2 px-3 py-2 text-sm text-muted">Αργία · {holiday}</p>}

      <div className="grid grid-cols-3 gap-2">
        {[
          { n: record ? roster.length - absent.length : "—", label: "παρόντες", cls: "text-brand-500" },
          { n: record ? absent.length : "—", label: "απόντες", cls: "text-danger" },
          { n: record ? late.length : "—", label: "καθυστέρηση", cls: "text-amber" },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-line bg-surface px-3 py-2.5">
            <p className={cx("text-2xl font-semibold tracking-[-0.02em] leading-none tabular-nums", x.cls)}>{x.n}</p>
            <p className="mt-1 text-[12px] text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            allPresent(cls.id, date);
            toast("Όλοι παρόντες");
          }}
        >
          <CheckCheck className="size-4" /> Όλοι παρόντες
        </Button>
        <span className="ml-auto text-xs text-muted">
          {recordedAt ? `Πάρθηκαν ${recordedAt.getHours().toString().padStart(2, "0")}:${recordedAt.getMinutes().toString().padStart(2, "0")}` : "Δεν έχουν παρθεί"}
        </span>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {roster.map((st) => {
          const state = absent.includes(st.id) ? "absent" : late.includes(st.id) ? "late" : "present";
          const name = `${st.firstName} ${st.lastName}`.trim();
          return (
            <li key={st.id}>
              <button
                type="button"
                onClick={() => cycle(cls.id, date, st.id)}
                aria-label={`${name}: ${state === "absent" ? "απών" : state === "late" ? "καθυστέρηση" : "παρών"}`}
                className={cx(
                  "grid w-full justify-items-center gap-1.5 rounded-2xl border px-1 pb-2 pt-3 transition-colors",
                  state === "absent" && "border-danger bg-danger-50",
                  state === "late" && "border-amber bg-amber-50",
                  state === "present" && "border-line bg-surface hover:bg-line-2",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "flex size-10 items-center justify-center rounded-full text-[13px] font-semibold tracking-[-0.02em]",
                    state === "absent" ? "bg-danger text-surface" : state === "late" ? "bg-amber text-surface" : "bg-brand-50 text-brand-500",
                  )}
                >
                  {initials(st)}
                </span>
                <span className="line-clamp-2 text-center text-[12px] font-semibold leading-tight">{name}</span>
                <span className={cx("h-3.5 text-[10.5px] font-bold", state === "absent" ? "text-danger" : "text-amber")}>
                  {state === "absent" ? "απών" : state === "late" ? "αργοπορία" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted">
        <Info className="size-4 shrink-0" /> Ένα πάτημα: απών · δεύτερο: καθυστέρηση · τρίτο: παρών. Αποθηκεύεται μόνο του.
      </p>
    </div>
  );
}

function Students({ roster }: { roster: Student[] }) {
  const notes = useApp((s) => s.studentNotes);
  const attendance = useApp((s) => s.attendance);
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line-2">
        {roster.map((st, i) => {
          const name = `${st.firstName} ${st.lastName}`.trim();
          const absences = Object.values(attendance).filter((r) => r.absentIds.includes(st.id)).length;
          const count = notes.filter((n) => n.studentId === st.id).length;
          return (
            <li key={st.id}>
              <Link href={`/students/${st.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-line-2">
                <Avatar name={name} seed={i} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{name}</span>
                  <span className="text-[12px] text-muted">
                    {absences} {absences === 1 ? "απουσία" : "απουσίες"} · {count} {count === 1 ? "σημείωση" : "σημειώσεις"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Progress({ cls, roster }: { cls: ClassGroup; roster: Student[] }) {
  const slots = useApp((s) => s.slots);
  const subjects = useSubjects();
  const attendance = useApp((s) => s.attendance);
  const today = useApp((s) => s.today);
  const past = useMemo(() => sortSlots(slots.filter((s) => s.classId === cls.id && s.date <= today)), [slots, cls.id, today]);
  const recorded = Object.entries(attendance).filter(([k]) => k.startsWith(`${cls.id}|`));
  const absences = roster
    .map((st) => ({ st, n: recorded.filter(([, r]) => r.absentIds.includes(st.id)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Ύλη ανά μάθημα</h2>
          <Button variant="soft" size="sm" onClick={() => openSyllabus({ classId: cls.id })}>
            <BookOpenCheck className="size-4" /> Πρόσθεσε ύλη
          </Button>
        </div>
        <ul className="space-y-4">
          {subjects.map((sub) => {
            const list = past.filter((s) => s.subjectId === sub.id);
            if (!list.length) return null;
            const done = list.filter((s) => s.status === "done").length;
            const partial = list.filter((s) => s.status === "partial").length;
            const last = [...list].reverse().find((s) => s.taughtNote);
            return (
              <li key={sub.id}>
                <div className="flex items-center gap-3">
                  <SubjectIcon id={sub.id} size="sm" />
                  <span className="flex-1 font-semibold">{sub.name}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {done}/{list.length} ώρες
                  </span>
                </div>
                <div className="ml-11 mt-2 flex h-2 overflow-hidden rounded-full bg-line-2">
                  <span className="bg-brand-500" style={{ width: `${(done / list.length) * 100}%` }} />
                  <span className="bg-math" style={{ width: `${(partial / list.length) * 100}%` }} />
                </div>
                {last && <p className="ml-11 mt-1.5 line-clamp-2 text-xs text-muted">Τελευταία: «{last.taughtNote}»</p>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Απουσίες</h2>
        <p className="mb-3 text-sm text-muted">{recorded.length} {recorded.length === 1 ? "καταγεγραμμένη ημέρα" : "καταγεγραμμένες ημέρες"}</p>
        {absences.length === 0 ? (
          <p className="text-sm text-muted">Καμία απουσία.</p>
        ) : (
          <ul className="space-y-2">
            {absences.map(({ st, n }) => (
              <li key={st.id} className="flex items-center gap-3">
                <Avatar name={`${st.firstName} ${st.lastName}`} seed={roster.indexOf(st)} size="sm" />
                <span className="flex-1 text-sm font-medium">
                  {st.firstName} {st.lastName}
                </span>
                <span className={cx("rounded-md px-2 py-0.5 text-xs font-bold", n >= 2 ? "bg-danger-50 text-danger" : "bg-line-2 text-ink-2")}>
                  {n} {n === 1 ? "απουσία" : "απουσίες"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 lg:col-span-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Τι διδάχθηκε</h2>
          <ButtonLink href={`/journal?class=${cls.id}`} variant="secondary" size="sm">
            <BookOpenCheck className="size-4" /> Ύλη
          </ButtonLink>
        </div>
        <ol className="relative space-y-4 border-l border-line pl-5">
          {[...past].reverse().slice(0, 10).map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[26.5px] top-1.5 size-3 rounded-full border-2 border-surface bg-brand-500" />
              <Link href={`/lessons/${s.id}`} className="group block">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-muted">
                    {shortDate(s.date)} · {s.start}
                  </span>
                  <span className="font-bold group-hover:underline">{subjects.find((x) => x.id === s.subjectId)?.name}</span>
                  <StatusPill slot={s} />
                </p>
                <p className="text-sm text-ink-2">{s.topic}</p>
                {s.taughtNote && <p className="mt-0.5 text-sm text-muted">«{s.taughtNote}»</p>}
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Notes({ cls }: { cls: ClassGroup }) {
  const all = useApp((s) => s.notes);
  const addNote = useApp((s) => s.addNote);
  const del = useApp((s) => s.deleteNote);
  const edit = useApp((s) => s.editNote);
  const restore = useApp((s) => s.restoreNote);
  const notes = all.filter((n) => n.classId === cls.id);
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Γράψε μια σημείωση για το τμήμα…"
          aria-label="Νέα σημείωση"
          className={cx(inputClass, "py-2.5")}
        />
        <div className="mt-2 flex justify-end">
          <Button
            disabled={!text.trim()}
            onClick={() => {
              addNote(cls.id, text.trim());
              setText("");
            }}
          >
            <Plus className="size-4" /> Προσθήκη σημείωσης
          </Button>
        </div>
      </Card>
      {notes.length === 0 ? (
        <EmptyState icon={<NotebookPen className="size-6" />} title="Καμία σημείωση ακόμη" />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id}>
              <Card className="group flex gap-3 p-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted">{longDate(n.date)}</p>
                  <AutoText
                    multiline
                    value={n.text}
                    onSave={(v) => edit(n.id, v)}
                    label="Κείμενο σημείωσης"
                    maxLength={2000}
                    className="mt-1 w-full rounded-md bg-transparent px-1 text-[15px] leading-relaxed outline-none focus:bg-line-2"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Διαγραφή σημείωσης"
                  onClick={() => {
                    del(n.id);
                    toast("Η σημείωση διαγράφηκε", { label: "Αναίρεση", run: () => restore(n) });
                  }}
                  className="flex size-9 shrink-0 items-center justify-center self-start rounded-lg text-muted hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "attendance";
  const cls = useApp((s) => s.classes.find((c) => c.id === id));
  const students = useApp((s) => s.students);
  const roster = useMemo(() => students.filter((s) => s.classId === id), [students, id]);
  const [editing, setEditing] = useState(false);

  if (!cls) return <EmptyState icon={<Users className="size-6" />} title="Το τμήμα δεν βρέθηκε" action={<ButtonLink href="/classes">Οι τάξεις μου</ButtonLink>} />;

  const setTab = (t: Tab) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", t);
    router.replace(`/classes/${cls.id}?${q}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-3xl lg:max-w-none">
      <PageHeader
        back="/classes"
        title={`${cls.name} · ${cls.grade}`}
        subtitle={[`${roster.length} ${roster.length === 1 ? "μαθητής" : "μαθητές"}`, cls.room].filter(Boolean).join(" · ")}
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Επεξεργασία
          </Button>
        }
      />
      {editing && <ClassSheet open cls={cls} onClose={() => setEditing(false)} />}
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        className="mb-5 lg:max-w-xl"
        options={[
          { value: "attendance", label: "Παρουσίες" },
          { value: "students", label: "Μαθητές" },
          { value: "progress", label: "Πρόοδος" },
          { value: "notes", label: "Σημειώσεις" },
        ]}
      />
      <div className={clsx(tab === "students" && "lg:max-w-2xl")}>
        {tab === "attendance" && <Attendance cls={cls} roster={roster} />}
        {tab === "students" && <Students roster={roster} />}
        {tab === "progress" && <Progress cls={cls} roster={roster} />}
        {tab === "notes" && <Notes cls={cls} />}
      </div>
      {tab === "attendance" && (
        <Button size="lg" className="mt-4 w-full lg:max-w-sm" onClick={() => setTab("notes")}>
          <NotebookPen className="size-5" /> Προσθήκη σημείωσης
        </Button>
      )}
    </div>
  );
}
