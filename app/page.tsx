"use client";

import clsx from "clsx";
import { ArrowRight, CalendarClock, Camera, ChevronRight, Clock, CloudUpload, Crown, NotebookPen, Plus, Trash2, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { needsLog, LessonRow } from "@/components/lesson";
import { MobileBrandBar } from "@/components/shell/PageHeader";
import { FileBadge, SUBJECT_STYLE } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, cx, EmptyState, inputClass, Select, Sheet } from "@/components/ui";
import { UploadTrigger } from "@/components/upload";
import { dayOfMonth, dayShort, DEMO_NOW, DEMO_TODAY, longDate, relativeTime, startOfWeek, weekDates } from "@/lib/dates";
import { fileKindLabel, formatBytes } from "@/lib/materials";
import { nextLesson, slotsOn } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import type { LessonSlot } from "@/lib/types";

function PaperIllustration() {
  return (
    <div aria-hidden className="pointer-events-none absolute -bottom-6 right-6 hidden h-48 w-72 xl:block">
      <div className="absolute right-0 top-6 h-44 w-36 rotate-6 rounded-md bg-white p-3 shadow-paper">
        <p className="text-[8px] font-bold tracking-wide text-ink-2">ΑΣΚΗΣΕΙΣ</p>
        <svg viewBox="0 0 100 70" className="mt-2 w-full">
          <path d="M8 4v58h88" fill="none" stroke="#bbb" strokeWidth="1" />
          <path d="M12 56 L40 38 L66 26 L92 10" fill="none" stroke="#3c7bc4" strokeWidth="2" />
        </svg>
      </div>
      <div className="absolute left-0 top-0 h-48 w-40 -rotate-6 rounded-md bg-white p-3 shadow-paper">
        <p className="text-[9px] font-bold text-ink">Γραφικές παραστάσεις</p>
        <div className="mt-2 flex h-20 items-end gap-2 border-b border-l border-line pl-1">
          {[60, 85, 45, 70, 95].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className={cx("w-3 rounded-t-sm", ["bg-meleti", "bg-math", "bg-meleti", "bg-math", "bg-meleti"][i])} />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {[90, 75, 85].map((w, i) => (
            <span key={i} style={{ width: `${w}%` }} className="block h-1 rounded bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NextLessonHero({ slot }: { slot: LessonSlot }) {
  const subject = useApp((s) => s.subjects.find((x) => x.id === slot.subjectId));
  const cls = useApp((s) => s.classes.find((x) => x.id === slot.classId));
  const Icon = SUBJECT_STYLE[slot.subjectId].Icon;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white lg:border lg:border-brand-100 lg:bg-brand-50 lg:p-7 lg:text-ink">
      <PaperIllustration />
      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70 lg:text-brand-500">Για το επόμενο μάθημα</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight lg:text-[28px] lg:text-brand-700">
            {subject?.name}
            <span className="hidden lg:inline"> · {cls?.grade}</span>
          </h2>
          <p className="mt-0.5 text-[15px] text-white/80 lg:text-lg lg:text-ink-2">{slot.topic}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 lg:border lg:border-line lg:bg-surface">
              <Clock className="size-4" /> {slot.start} – {slot.end}
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 lg:border lg:border-line lg:bg-surface">
              <Users className="size-4" /> {cls?.name}
            </span>
          </div>
          <Link
            href={`/lessons/${slot.id}`}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-brand-700 hover:bg-brand-50 lg:h-11 lg:rounded-xl lg:bg-brand lg:px-5 lg:text-[15px] lg:text-white lg:hover:bg-brand-700"
          >
            Άνοιγμα μαθήματος <ArrowRight className="size-4" />
          </Link>
        </div>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 lg:hidden">
          <Icon className="size-7" />
        </span>
      </div>
    </section>
  );
}

function LogPrompt({ slot }: { slot: LessonSlot }) {
  const subject = useApp((s) => s.subjects.find((x) => x.id === slot.subjectId));
  const updateSlot = useApp((s) => s.updateSlot);
  const set = (status: LessonSlot["status"]) => {
    updateSlot(slot.id, { status });
    toast(`${subject?.name}: ${status === "done" ? "ολοκληρώθηκε" : status === "partial" ? "μερικώς" : "δεν έγινε"}`, {
      label: "Αναίρεση",
      run: () => updateSlot(slot.id, { status: "planned" }),
    });
  };
  return (
    <Card className="border-danger/20 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger">
          <NotebookPen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Πώς πήγε η {subject?.name.toLowerCase()};</p>
          <p className="truncate text-sm text-muted">
            {slot.start} · {slot.topic}
          </p>
        </div>
        <Link href={`/lessons/${slot.id}`} className="hidden text-sm font-semibold text-brand hover:underline sm:block">
          Σημείωση
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="soft" size="sm" onClick={() => set("done")}>Ολοκληρώθηκε</Button>
        <Button variant="secondary" size="sm" onClick={() => set("partial")}>Μερικώς</Button>
        <Button variant="secondary" size="sm" onClick={() => set("skipped")}>Δεν έγινε</Button>
      </div>
    </Card>
  );
}

function QuickNoteSheet({ open, onClose, defaultClass }: { open: boolean; onClose: () => void; defaultClass: string }) {
  const classes = useApp((s) => s.classes);
  const addNote = useApp((s) => s.addNote);
  const [classId, setClassId] = useState(defaultClass);
  const [text, setText] = useState("");
  const save = () => {
    if (!text.trim()) return;
    addNote(classId, text.trim());
    setText("");
    onClose();
    toast("Η σημείωση αποθηκεύτηκε");
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Γρήγορη σημείωση"
      footer={
        <Button className="w-full" onClick={save} disabled={!text.trim()}>
          Αποθήκευση
        </Button>
      }
    >
      <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Τμήμα">
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.grade}
          </option>
        ))}
      </Select>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="π.χ. Ο Νίκος χρειάζεται επιπλέον εξάσκηση στην προπαίδεια."
        className={cx(inputClass, "mt-3 py-2.5")}
      />
    </Sheet>
  );
}

function TodayChecklist() {
  const tasks = useApp((s) => s.tasks);
  const toggle = useApp((s) => s.toggleTask);
  const add = useApp((s) => s.addTask);
  const remove = useApp((s) => s.removeTask);
  const [text, setText] = useState("");
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-lg font-bold">Για σήμερα</h2>
      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="group flex items-center gap-3 rounded-lg py-1.5">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
              aria-label={t.text}
              className="size-5 shrink-0 cursor-pointer rounded-md accent-brand-500"
            />
            <span className={cx("flex-1 text-[15px]", t.done && "text-muted line-through")}>
              {t.text}
              {t.time && <span className="text-muted"> · {t.time}</span>}
            </span>
            <button
              type="button"
              aria-label={`Διαγραφή: ${t.text}`}
              onClick={() => remove(t.id)}
              className="text-muted opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add(text.trim());
          setText("");
        }}
      >
        <Plus className="size-5 text-muted" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Πρόσθεσε κάτι…" aria-label="Νέα εργασία" className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
      </form>
    </Card>
  );
}

function UploadCard() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
          <CloudUpload className="size-6" />
        </span>
        <div>
          <h2 className="font-bold leading-snug">Από το αρχείο σου, στο μάθημα</h2>
          <p className="text-sm text-muted">Ανέβασε PDF, Word ή φωτογραφία</p>
        </div>
      </div>
      <UploadTrigger className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white hover:bg-brand-700">
        <CloudUpload className="size-5" /> Ανέβασμα αρχείου
      </UploadTrigger>
      <div className="mt-3 flex justify-center gap-5 text-xs text-muted">
        <span className="flex items-center gap-1.5"><FileBadge className="size-6 rounded-md [&>svg]:size-3.5" file={{ name: "a.pdf", size: 0, type: "application/pdf" }} /> PDF</span>
        <span className="flex items-center gap-1.5"><FileBadge className="size-6 rounded-md [&>svg]:size-3.5" file={{ name: "a.docx", size: 0, type: "" }} /> Word</span>
        <span className="flex items-center gap-1.5"><FileBadge className="size-6 rounded-md [&>svg]:size-3.5" file={{ name: "a.jpg", size: 0, type: "image/jpeg" }} /> Εικόνα</span>
      </div>
    </Card>
  );
}

function RecentMaterial() {
  const materials = useApp((s) => s.materials);
  const recent = [...materials].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Πρόσφατο υλικό</h2>
        <Link href="/materials" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          Προβολή όλων <ArrowRight className="size-4" />
        </Link>
      </div>
      <ul className="divide-y divide-line-2">
        {recent.map((m) => (
          <li key={m.id}>
            <Link href={`/materials/${m.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
              <FileBadge file={m.file} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.title}</span>
                <span className="text-sm text-muted">
                  {m.file ? `${fileKindLabel(m.file.type, m.file.name)} · ${formatBytes(m.file.size)}` : "Δημιουργήθηκε στην τάξη"}
                </span>
              </span>
              <span className="hidden text-sm text-muted sm:block">Τροποποιήθηκε {relativeTime(m.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function TodayPage() {
  const slots = useApp((s) => s.slots);
  const tasks = useApp((s) => s.tasks);
  const [day, setDay] = useState(DEMO_TODAY);
  const [noteOpen, setNoteOpen] = useState(false);
  const next = nextLesson(slots, DEMO_TODAY, DEMO_NOW);
  const toLog = slotsOn(slots, DEMO_TODAY).filter(needsLog);
  const daySlots = slotsOn(slots, day);
  const meeting = tasks.find((t) => t.time && !t.done);
  const quick = "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface py-3.5 text-sm font-medium text-ink-2 shadow-card hover:bg-line-2";

  return (
    <div>
      <MobileBrandBar />
      <header className="mb-4 lg:mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight text-brand-700 sm:text-[40px] sm:leading-tight">Καλημέρα, Σπύρο.</h1>
        <p className="mt-0.5 text-[15px] text-muted sm:text-lg">
          {longDate(DEMO_TODAY)}
          <span className="hidden sm:inline"> · Η μέρα σου, οργανωμένη.</span>
          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-line-2 px-1.5 py-0.5 align-middle text-xs font-semibold text-muted" title="Το πρωτότυπο τρέχει σε σταθερή ώρα επίδειξης">
            <CalendarClock className="size-3" /> demo {DEMO_NOW}
          </span>
        </p>
      </header>

      <Link href="/about#plans" className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm lg:hidden">
        <Crown className="size-4 text-amber" />
        <span className="font-semibold">Δοκιμή</span>
        <span className="text-muted">· 5 ημέρες ακόμη</span>
        <ChevronRight className="ml-auto size-4 text-muted" />
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5 lg:col-span-2">{next && <NextLessonHero slot={next} />}</div>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-3 gap-3 lg:hidden">
            <Link href={`/classes/${next?.classId ?? "d1"}`} className={quick}>
              <UserCheck className="size-6 text-ink-2" strokeWidth={1.6} /> Απουσίες
            </Link>
            <button type="button" className={quick} onClick={() => setNoteOpen(true)}>
              <NotebookPen className="size-6 text-ink-2" strokeWidth={1.6} /> Σημείωση
            </button>
            <UploadTrigger camera className={cx(quick, "w-full")}>
              <Camera className="size-6 text-ink-2" strokeWidth={1.6} /> Σάρωση
            </UploadTrigger>
          </div>

          {toLog.map((s) => (
            <LogPrompt key={s.id} slot={s} />
          ))}

          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">
                <span className="lg:hidden">Σήμερα</span>
                <span className="hidden lg:inline">Το πρόγραμμά σου</span>
              </h2>
              <div className="flex gap-1.5" role="tablist" aria-label="Ημέρα">
                {weekDates(startOfWeek(DEMO_TODAY)).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="tab"
                    aria-selected={d === day}
                    onClick={() => setDay(d)}
                    className={clsx(
                      "flex h-12 w-11 flex-col items-center justify-center rounded-xl border text-[10px] font-semibold leading-tight sm:w-14",
                      d === day ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:bg-line-2",
                    )}
                  >
                    {dayShort(d)}
                    <span className={cx("text-base font-bold", d === day ? "text-white" : "text-ink")}>{dayOfMonth(d)}</span>
                  </button>
                ))}
              </div>
            </div>
            {daySlots.length ? (
              <div className="space-y-2">
                {daySlots.map((s) => (
                  <LessonRow key={s.id} slot={s} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<CalendarClock className="size-6" />} title="Κανένα μάθημα" text="Δεν υπάρχουν μαθήματα αυτή τη μέρα." />
            )}
          </Card>

          {meeting && (
            <Link href="#tasks" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 lg:hidden">
              <CalendarClock className="size-6 text-ink-2" />
              <span className="flex-1">
                <span className="block font-bold">
                  {meeting.text} · {meeting.time}
                </span>
                {meeting.detail && <span className="text-sm text-muted">{meeting.detail}</span>}
              </span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          )}

          <div className="hidden lg:block">
            <RecentMaterial />
          </div>
        </div>

        <div className="space-y-5" id="tasks">
          <TodayChecklist />
          <UploadCard />
          <div className="lg:hidden">
            <RecentMaterial />
          </div>
          <ButtonLink href="/schedule" variant="secondary" className="w-full lg:hidden">
            Όλο το πρόγραμμα της εβδομάδας
          </ButtonLink>
        </div>
      </div>
      <QuickNoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} defaultClass={next?.classId ?? "d1"} />
    </div>
  );
}
