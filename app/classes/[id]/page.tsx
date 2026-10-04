"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, CalendarDays, Info, NotebookPen, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { toast } from "@/components/toast";
import { Avatar, Button, ButtonLink, Card, CheckCircle, cx, EmptyState, inputClass, Segmented } from "@/components/ui";
import { addDays, dayName, DEMO_TODAY, longDate, shortDate, weekday } from "@/lib/dates";
import { sortSlots } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import type { ClassGroup, Student } from "@/lib/types";

type Tab = "attendance" | "progress" | "notes";

function prevSchoolDay(d: string, dir: -1 | 1): string {
  let x = addDays(d, dir);
  while (weekday(x) === 0 || weekday(x) === 6) x = addDays(x, dir);
  return x;
}

function Attendance({ cls, roster }: { cls: ClassGroup; roster: Student[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date") ?? DEMO_TODAY;
  const record = useApp((s) => s.attendance[`${cls.id}|${date}`]);
  const toggle = useApp((s) => s.toggleAbsent);
  const allPresent = useApp((s) => s.markAllPresent);
  const absent = record?.absentIds ?? [];
  const go = (d: string) => router.replace(`/classes/${cls.id}?date=${d}`, { scroll: false });
  const recordedAt = record ? new Date(record.recordedAt) : undefined;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-2">
        <button type="button" aria-label="Προηγούμενη μέρα" onClick={() => go(prevSchoolDay(date, -1))} className="flex size-10 items-center justify-center rounded-lg hover:bg-line-2">
          <ChevronLeft className="size-5" />
        </button>
        <span className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5" />
          {date === DEMO_TODAY ? "Σήμερα" : dayName(date)} · {longDate(date).split(", ")[1]}
        </span>
        <button
          type="button"
          aria-label="Επόμενη μέρα"
          disabled={date >= DEMO_TODAY}
          onClick={() => go(prevSchoolDay(date, 1))}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-line-2 disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4">
          <Users className="size-6 text-brand-500" />
          <div>
            <p className="text-2xl font-extrabold leading-none text-brand">{record ? roster.length - absent.length : "—"}</p>
            <p className="text-sm text-ink-2">παρόντες</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-danger-50 p-4">
          <Users className="size-6 text-danger" />
          <div>
            <p className="text-2xl font-extrabold leading-none text-danger">{record ? absent.length : "—"}</p>
            <p className="text-sm text-ink-2">απόντες</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line-2 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              allPresent(cls.id, date);
              toast("Όλοι παρόντες");
            }}
            className="flex items-center gap-3 text-[15px] font-medium"
          >
            <CheckCircle checked={!!record && absent.length === 0} />
            Όλοι παρόντες
          </button>
          <span className="ml-auto text-xs text-muted">
            {recordedAt ? `Καταγράφηκε ${recordedAt.getHours().toString().padStart(2, "0")}:${recordedAt.getMinutes().toString().padStart(2, "0")}` : "Δεν έχει καταγραφεί"}
          </span>
        </div>
        <ul className="divide-y divide-line-2">
          {roster.map((st, i) => {
            const isAbsent = absent.includes(st.id);
            const name = `${st.firstName} ${st.lastName}`;
            return (
              <li key={st.id}>
                <button
                  type="button"
                  onClick={() => toggle(cls.id, date, st.id)}
                  aria-pressed={!isAbsent && !!record}
                  aria-label={`${name}: ${isAbsent ? "απών" : "παρών"}`}
                  className={clsx("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-line-2/60", isAbsent && "bg-danger-50/40")}
                >
                  <Avatar name={name} seed={i} />
                  <span className="flex-1 text-[15px] font-medium">{name}</span>
                  {isAbsent && <span className="text-xs font-semibold text-danger">απών</span>}
                  <CheckCircle checked={!!record && !isAbsent} tone={isAbsent ? "danger" : "brand"} />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
        <Info className="size-4" /> Πάτησε έναν μαθητή για απουσία · οι αλλαγές αποθηκεύονται αυτόματα
      </p>
    </div>
  );
}

function Progress({ cls, roster }: { cls: ClassGroup; roster: Student[] }) {
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const attendance = useApp((s) => s.attendance);
  const past = useMemo(() => sortSlots(slots.filter((s) => s.classId === cls.id && s.date <= DEMO_TODAY)), [slots, cls.id]);
  const recorded = Object.entries(attendance).filter(([k]) => k.startsWith(`${cls.id}|`));
  const absences = roster
    .map((st) => ({ st, n: recorded.filter(([, r]) => r.absentIds.includes(st.id)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-bold">Ύλη ανά μάθημα</h2>
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
        <p className="mb-3 text-sm text-muted">{recorded.length} καταγεγραμμένες ημέρες</p>
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
        <h2 className="mb-3 text-lg font-bold">Τι διδάχθηκε</h2>
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
                  <p className="mt-1 text-[15px]">{n.text}</p>
                </div>
                <button type="button" aria-label="Διαγραφή σημείωσης" onClick={() => del(n.id)} className="self-start text-muted hover:text-danger">
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

  if (!cls) return <EmptyState icon={<Users className="size-6" />} title="Το τμήμα δεν βρέθηκε" action={<ButtonLink href="/classes">Οι τάξεις μου</ButtonLink>} />;

  const setTab = (t: Tab) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", t);
    router.replace(`/classes/${cls.id}?${q}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-3xl lg:max-w-none">
      <PageHeader back="/classes" title={`${cls.name} · ${cls.grade}`} subtitle={`${roster.length} μαθητές · ${cls.room}`} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        className="mb-5 lg:max-w-md"
        options={[
          { value: "attendance", label: "Παρουσίες" },
          { value: "progress", label: "Πρόοδος" },
          { value: "notes", label: "Σημειώσεις" },
        ]}
      />
      <div className={clsx(tab === "attendance" && "lg:max-w-2xl")}>
        {tab === "attendance" && <Attendance cls={cls} roster={roster} />}
        {tab === "progress" && <Progress cls={cls} roster={roster} />}
        {tab === "notes" && <Notes cls={cls} />}
      </div>
      {tab === "attendance" && (
        <Button size="lg" className="mt-4 w-full lg:max-w-2xl" onClick={() => setTab("notes")}>
          <NotebookPen className="size-5" /> Προσθήκη σημείωσης
        </Button>
      )}
    </div>
  );
}
