"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowRight, CalendarArrowUp, CalendarClock, CalendarCog, Check, CloudUpload, CornerDownRight, History, Link2Off, Paperclip, Pencil, Sparkles, UserCheck, Users } from "@/components/icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { needsLog, STATUS_LABEL, useClock } from "@/components/lesson";
import { LessonSheet } from "@/components/lessonForm";
import { AutoText, GrowingTextarea } from "@/components/text";
import { PageHeader } from "@/components/shell/PageHeader";
import { FileBadge, SubjectIcon } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, ButtonLink, buttonClass, Card, cx, EmptyState, inputClass, Segmented, Sheet } from "@/components/ui";
import { openPrepare, PrepareTiles } from "@/components/prepare";
import { UploadTrigger } from "@/components/upload";
import { addDays, dayName, dayShort, dayOfMonth, longDate, shortDate, timeToMin, weekday } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/materials";
import { findConflicts, sortSlots } from "@/lib/schedule";
import { holidayOn, type Country } from "@/lib/schoolYear";
import { kindLabel, periodsFrom } from "@/lib/timetable";
import { attendanceFor, useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { LessonSlot, LessonStatus, TimeBlock } from "@/lib/types";

const NOTE_MAX = 2000;
const NOTE_CHIPS = ["Ολοκληρώθηκε η ενότητα", "Μέχρι την άσκηση 2", "Χρειάζεται επανάληψη", "Δόθηκε εργασία για το σπίτι"];

function schoolDays(from: string, count: number, country: Country): string[] {
  const out: string[] = [];
  for (let d = from, n = 0; out.length < count && n < 120; d = addDays(d, 1), n++) if (weekday(d) >= 1 && weekday(d) <= 5 && !holidayOn(country, d)) out.push(d);
  return out;
}

function CarryOverPanel({ slot }: { slot: LessonSlot }) {
  const lessons = useApp((s) => s.slots);
  const blocks = useApp((s) => s.blocks);
  const timetable = useApp((s) => s.timetable);
  const country = useApp((s) => s.profile.country);
  const { today, now } = useClock();
  // Κενά don't block a move; παιδονομία and συσκέψεις do.
  const slots = useMemo(() => [...lessons, ...blocks.filter((b) => b.kind !== "free")], [lessons, blocks]);
  const PERIODS = useMemo(() => periodsFrom(timetable.filter((e) => e.kind === "lesson" || e.kind === "free"), country), [timetable, country]);
  const subjects = useSubjects();
  const carryOver = useApp((s) => s.carryOver);
  const undo = useApp((s) => s.undoCarryOver);
  const days = useMemo(() => schoolDays(today, 10, country), [today, country]);
  const firstFree = useMemo(() => {
    for (const date of days)
      for (const p of PERIODS) {
        if (date === today && timeToMin(p.start) <= timeToMin(now)) continue;
        if (findConflicts(slots, { date, ...p }, slot.id).length === 0 && !(date === slot.date && p.start === slot.start)) return { date, ...p };
      }
  }, [days, slots, slot, PERIODS, today, now]);
  const [date, setDate] = useState(firstFree?.date ?? days[0]);
  const [start, setStart] = useState<string | null>(firstFree?.start ?? null);
  const period = PERIODS.find((p) => p.start === start);
  const conflicts = period ? findConflicts(slots, { date, ...period }, slot.id) : [];
  const busyLabel = (x: LessonSlot | TimeBlock) =>
    "subjectId" in x ? subjects.find((s) => s.id === x.subjectId)?.name : `${kindLabel(x.kind, country)}${x.label ? ` · ${x.label}` : ""}`;

  const confirm = () => {
    if (!period) return;
    const r = carryOver(slot.id, { date, ...period });
    if (r.ok) {
      toast(`Μεταφέρθηκε: ${dayName(date)} ${period.start}`, { label: "Αναίρεση", run: () => undo(r.newSlot.id) });
    } else if (r.reason === "conflict") {
      toast("Η ώρα δεν είναι πια ελεύθερη.");
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Το μάθημα μένει στο ιστορικό ως «{STATUS_LABEL[slot.status === "planned" || slot.status === "done" ? "partial" : slot.status].toLowerCase()}» και δημιουργείται συνέχεια με το ίδιο υλικό.
      </p>
      {firstFree && (
        <button
          type="button"
          onClick={() => {
            setDate(firstFree.date);
            setStart(firstFree.start);
          }}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-100"
        >
          <CalendarClock className="size-3.5" /> Πρώτη ελεύθερη ώρα: {dayName(firstFree.date)} {firstFree.start}
        </button>
      )}
      <div className="scrollbar-none -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === date}
            onClick={() => {
              setDate(d);
              setStart(null);
            }}
            className={clsx(
              "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-semibold",
              d === date ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:bg-line-2",
            )}
          >
            {dayShort(d)}
            <span className={clsx("text-base font-bold leading-tight", d === date ? "text-white" : "text-ink")}>{dayOfMonth(d)}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PERIODS.map((p) => {
          const busy = findConflicts(slots, { date, ...p }, slot.id);
          const past = date === today && timeToMin(p.start) <= timeToMin(now);
          const self = date === slot.date && p.start === slot.start;
          const selected = start === p.start;
          return (
            <button
              key={p.start}
              type="button"
              disabled={past || self}
              aria-pressed={selected}
              onClick={() => setStart(p.start)}
              className={clsx(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                selected && busy.length && "border-danger bg-danger-50",
                selected && !busy.length && "border-brand bg-brand-50",
                !selected && "border-line bg-surface hover:bg-line-2",
              )}
            >
              <span className="block font-semibold tabular-nums">{p.start}–{p.end}</span>
              <span className={clsx("block truncate text-xs", busy.length ? "text-danger" : "text-brand-500")}>
                {self ? "τρέχον μάθημα" : past ? "έχει περάσει" : busy.length ? busyLabel(busy[0]) : "ελεύθερη"}
              </span>
            </button>
          );
        })}
      </div>
      {conflicts.length > 0 && (
        <div role="alert" className="mt-3 flex gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Σύγκρουση: έχεις ήδη {conflicts.map((c) => `${busyLabel(c)} (${c.start}–${c.end})`).join(", ")} στις {shortDate(date)}. Διάλεξε άλλη ώρα.
          </span>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={!period || conflicts.length > 0} onClick={confirm}>
        <CalendarArrowUp className="size-4" />
        {period ? `Μεταφορά σε ${dayName(date)} ${shortDate(date)} · ${period.start}` : "Διάλεξε ώρα"}
      </Button>
    </div>
  );
}

function AttachSheet({ slot, open, onClose }: { slot: LessonSlot; open: boolean; onClose: () => void }) {
  const materials = useApp((s) => s.materials);
  const attach = useApp((s) => s.attachMaterial);
  const detach = useApp((s) => s.detachMaterial);
  const sorted = [...materials].sort((a, b) => Number(b.subjectId === slot.subjectId) - Number(a.subjectId === slot.subjectId) || b.updatedAt - a.updatedAt);
  return (
    <Sheet open={open} onClose={onClose} title="Υλικό από τη βιβλιοθήκη" footer={<Button className="w-full" onClick={onClose}>Τέλος</Button>}>
      {sorted.length === 0 && <p className="text-sm text-muted">Η βιβλιοθήκη είναι άδεια.</p>}
      <ul className="space-y-1.5">
        {sorted.map((m) => {
          const on = slot.materialIds.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => (on ? detach(slot.id, m.id) : attach(slot.id, m.id))}
                className={clsx("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left", on ? "border-brand bg-brand-50" : "border-line hover:bg-line-2")}
              >
                <FileBadge file={m.file} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="text-xs text-muted">{KIND_LABEL[m.kind]}</span>
                </span>
                <span className={clsx("flex size-6 items-center justify-center rounded-full border-2", on ? "border-brand bg-brand text-white" : "border-line")}>
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

type Stage = "before" | "class" | "after";
const STAGES: { value: Stage; label: string }[] = [
  { value: "before", label: "Πριν" },
  { value: "class", label: "Στην τάξη" },
  { value: "after", label: "Μετά" },
];

/** "Τι διδάχθηκε": one big field (the phone keyboard can dictate), quick chips, and the status after the lesson. */
function TaughtCard({ slot, future, withStatus }: { slot: LessonSlot; future: boolean; withStatus?: boolean }) {
  const updateSlot = useApp((s) => s.updateSlot);
  const clock = useClock();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{withStatus ? "Πώς πήγε" : "Τι κάναμε"}</h2>
        {needsLog(slot, clock) && <span className="rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger">Πώς πήγε;</span>}
      </div>
      {withStatus && (
        <Segmented<LessonStatus>
          value={slot.status}
          onChange={(status) => updateSlot(slot.id, { status })}
          options={(["planned", "done", "partial", "skipped"] as const).map((v) => ({ value: v, label: v === "planned" ? (future ? "Προγραμμ." : "Εκκρεμεί") : STATUS_LABEL[v] }))}
          className="mb-3"
          size="sm"
        />
      )}
      <GrowingTextarea
        value={slot.taughtNote}
        onChange={(e) => updateSlot(slot.id, { taughtNote: e.target.value })}
        rows={withStatus ? 3 : 4}
        maxLength={NOTE_MAX}
        placeholder={future ? "Σημειώσεις προετοιμασίας…" : "π.χ. Κάναμε τις ασκήσεις 1–2. Η 3 έμεινε για την επόμενη φορά."}
        className={cx(inputClass, "min-h-24 py-2.5 text-[15px] leading-relaxed")}
        aria-label="Σημείωση μαθήματος"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateSlot(slot.id, { taughtNote: (slot.taughtNote ? `${slot.taughtNote.trimEnd()} ${c}.` : `${c}.`).slice(0, NOTE_MAX) })}
            className="min-h-9 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-line-2"
          >
            + {c}
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Check className="size-3.5" /> Αποθηκεύεται αυτόματα · μπορείς να υπαγορεύσεις με το μικρόφωνο του πληκτρολογίου
      </p>
    </Card>
  );
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const slot = useApp((s) => s.slots.find((x) => x.id === id));
  const slots = useApp((s) => s.slots);
  const subject = useSubjects().find((x) => x.id === slot?.subjectId);
  const cls = useApp((s) => s.classes.find((x) => x.id === slot?.classId));
  const allStudents = useApp((s) => s.students);
  const students = allStudents.filter((x) => x.classId === slot?.classId);
  const materials = useApp((s) => s.materials);
  const attendance = useApp((s) => (slot ? attendanceFor(s, slot.classId, slot.date) : undefined));
  const updateSlot = useApp((s) => s.updateSlot);
  const detach = useApp((s) => s.detachMaterial);
  const clock = useClock();
  const [attachOpen, setAttachOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState<Stage>(() => {
    if (!slot) return "before";
    if (slot.date > clock.today || (slot.date === clock.today && timeToMin(clock.now) < timeToMin(slot.start))) return "before";
    if (slot.date === clock.today && timeToMin(clock.now) < timeToMin(slot.end)) return "class";
    return "after";
  });

  if (!slot || !subject || !cls)
    return <EmptyState icon={<History className="size-6" />} title="Το μάθημα δεν βρέθηκε" action={<ButtonLink href="/schedule">Στο πρόγραμμα</ButtonLink>} />;

  const linked = slot.materialIds.map((mid) => materials.find((m) => m.id === mid)).filter((m) => m !== undefined);
  const previous = sortSlots(slots.filter((s) => s.classId === slot.classId && s.subjectId === slot.subjectId && s.date < slot.date && s.taughtNote)).at(-1);
  const carriedFrom = slots.find((s) => s.id === slot.carriedFromId);
  const carriedTo = slots.find((s) => s.id === slot.carriedToId);
  const future = slot.date > clock.today;
  const canCarry = !slot.carriedToId && slot.status !== "done";

  return (
    <div>
      <PageHeader
        back="/schedule"
        eyebrow={`${longDate(slot.date)} · ${slot.start}–${slot.end}`}
        title={
          <span className="flex items-center gap-3">
            <SubjectIcon id={slot.subjectId} className="hidden sm:inline-flex" /> {subject.name}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <AutoText
              value={slot.topic}
              onSave={(topic) => updateSlot(slot.id, { topic })}
              allowEmpty
              maxLength={200}
              label="Θέμα μαθήματος"
              placeholder="Πρόσθεσε θέμα μαθήματος"
              className="-ml-1 h-10 w-full min-w-0 max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-ink-2 outline-none placeholder:text-muted hover:border-line focus:border-brand-500 focus:bg-surface"
            />
            <Pencil className="size-4 shrink-0 text-muted" aria-hidden />
          </span>
        }
        actions={
          <>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold">
              <Users className="size-4" /> {cls.name}
              {cls.room && ` · ${cls.room}`}
            </span>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <CalendarCog className="size-4" /> Αλλαγή ώρας / διαγραφή
            </Button>
          </>
        }
      />
      {editing && <LessonSheet open slot={slot} onClose={() => setEditing(false)} />}

      {carriedFrom && (
        <Link href={`/lessons/${carriedFrom.id}`} className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm">
          <CornerDownRight className="mt-0.5 size-5 shrink-0 text-amber" />
          <span>
            <span className="font-bold">Συνέχεια από {dayName(carriedFrom.date)} {shortDate(carriedFrom.date)}, {carriedFrom.start}.</span>
            {carriedFrom.taughtNote && <span className="block text-ink-2">Τότε: «{carriedFrom.taughtNote}»</span>}
          </span>
        </Link>
      )}
      {carriedTo && (
        <Link href={`/lessons/${carriedTo.id}`} className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm">
          <CalendarArrowUp className="size-5 shrink-0 text-amber" />
          <span className="flex-1">
            <span className="font-bold">Μεταφέρθηκε</span> σε {dayName(carriedTo.date)} {shortDate(carriedTo.date)}, {carriedTo.start}
          </span>
          <ArrowRight className="size-4 text-amber" />
        </Link>
      )}

      <nav aria-label="Στάδια μαθήματος" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
        {STAGES.map((st, i) => {
          const on = stage === st.value;
          const done = st.value === "before" ? linked.length > 0 : st.value === "class" ? !!slot.taughtNote.trim() : slot.status !== "planned";
          return (
            <button
              key={st.value}
              type="button"
              aria-pressed={on}
              onClick={() => setStage(st.value)}
              className={clsx(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors",
                on ? "bg-brand-50 text-brand shadow-[inset_0_0_0_1px_var(--color-brand-100)]" : "text-ink-2 hover:bg-line-2",
              )}
            >
              <span
                className={clsx(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  done ? "bg-brand-500 text-white" : on ? "bg-brand text-white" : "bg-line-2 text-muted",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {st.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5">
        {stage === "before" && (
          <>
            <Card className="p-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Sparkles className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Ετοίμασε για αυτό το μάθημα</h2>
                  <p className="text-sm text-muted">
                    {slot.topic ? `«${slot.topic}», ${cls.grade}.` : "Γράψε θέμα πάνω, για πιο στοχευμένο υλικό."} Ό,τι φτιάξεις μπαίνει μόνο του στο μάθημα.
                  </p>
                </div>
              </div>
              <PrepareTiles compact onPick={(kind) => openPrepare({ slotId: slot.id, kind })} />
              <button type="button" onClick={() => openPrepare({ slotId: slot.id })} className="mt-3 text-sm font-semibold text-brand-500 hover:underline">
                Από φωτογραφία βιβλίου ή με δική σου οδηγία
              </button>
            </Card>
            {previous && previous.id !== carriedFrom?.id && (
              <Card className="p-5">
                <p className="text-xs font-semibold text-muted">
                  Την προηγούμενη φορά · {dayName(previous.date)} {shortDate(previous.date)}
                  {previous.topic && ` · ${previous.topic}`}
                </p>
                <p className="mt-1 text-[15px] text-ink-2">«{previous.taughtNote}»</p>
              </Card>
            )}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Υλικό μαθήματος</h2>
                <span className="text-sm text-muted">{linked.length} {linked.length === 1 ? "αρχείο" : "αρχεία"}</span>
              </div>
              {linked.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">Δεν έχει συνδεθεί υλικό ακόμη.</p>
              ) : (
                <ul className="space-y-2">
                  {linked.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line-2 p-2.5">
                      <FileBadge file={m.file} />
                      <Link href={`/materials/${m.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate font-semibold">{m.title}</span>
                        <span className="text-xs text-muted">{KIND_LABEL[m.kind]}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`Αποσύνδεση: ${m.title}`}
                        title="Αποσύνδεση από το μάθημα"
                        onClick={() => detach(slot.id, m.id)}
                        className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-line-2 hover:text-danger"
                      >
                        <Link2Off className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAttachOpen(true)}>
                  <Paperclip className="size-4" /> Από τη βιβλιοθήκη
                </Button>
                <UploadTrigger slotId={slot.id} className={buttonClass("secondary", "sm")}>
                  <CloudUpload className="size-4" /> Ανέβασμα αρχείου
                </UploadTrigger>
              </div>
            </Card>
          </>
        )}

        {stage === "class" && (
          <>
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Παρουσίες</h2>
                {!future && (
                  <ButtonLink href={`/classes/${slot.classId}?date=${slot.date}`} variant="secondary" size="sm">
                    <UserCheck className="size-4" /> {attendance ? "Αλλαγή" : "Παρουσίες"}
                  </ButtonLink>
                )}
              </div>
              {attendance ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: students.length - attendance.absentIds.length, label: "παρόντες", cls: "text-brand" },
                    { n: attendance.absentIds.length, label: "απόντες", cls: "text-danger" },
                    { n: attendance.lateIds?.length ?? 0, label: "καθυστέρηση", cls: "text-amber" },
                  ].map((x) => (
                    <div key={x.label} className="rounded-xl bg-bg p-3">
                      <p className={cx("text-2xl font-semibold tracking-[-0.02em] tabular-nums", x.cls)}>{x.n}</p>
                      <p className="text-sm text-ink-2">{x.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{future ? "Παίρνονται την ημέρα του μαθήματος." : "Δεν έχουν παρθεί ακόμη."}</p>
              )}
            </Card>
            {linked.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {linked.map((m) => (
                  <Link key={m.id} href={`/materials/${m.id}`} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-line-2">
                    <FileBadge file={m.file} className="size-7" /> {m.title}
                  </Link>
                ))}
              </div>
            )}
            <TaughtCard slot={slot} future={future} />
          </>
        )}

        {stage === "after" && (
          <>
            <TaughtCard slot={slot} future={future} withStatus />
            {canCarry && (
              <Card className="p-5">
                <h2 className="mb-1 text-lg font-bold">Δεν ολοκληρώθηκε;</h2>
                <CarryOverPanel slot={slot} />
              </Card>
            )}
          </>
        )}
      </div>
      <AttachSheet slot={slot} open={attachOpen} onClose={() => setAttachOpen(false)} />
    </div>
  );
}
