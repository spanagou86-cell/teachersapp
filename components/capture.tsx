"use client";

import clsx from "clsx";
import { Camera, MessageSquareText, NotebookPen, PhoneCall, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { timeToMin } from "@/lib/dates";
import { slotsOn, upcomingLesson } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { needsLog, useClock } from "./lesson";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Segmented, Select, Sheet } from "./ui";
import { UploadTrigger } from "./upload";

/** Lesson the teacher most likely wants to log: one waiting for a note, else the current or next one. */
function useFocusLesson() {
  const slots = useApp((s) => s.slots);
  const clock = useClock();
  const todays = slotsOn(slots, clock.today);
  const waiting = todays.filter((s) => needsLog(s, clock)).at(-1);
  const current = todays.find((s) => timeToMin(s.start) <= timeToMin(clock.now) && timeToMin(clock.now) < timeToMin(s.end));
  return waiting ?? current ?? upcomingLesson(slots, clock.today, clock.now);
}

export function NoteSheet({ open, onClose, defaultKind = "note" }: { open: boolean; onClose: () => void; defaultKind?: "note" | "parent" }) {
  const classes = useApp((s) => s.classes);
  const students = useApp((s) => s.students);
  const addNote = useApp((s) => s.addNote);
  const addStudentNote = useApp((s) => s.addStudentNote);
  const focus = useFocusLesson();
  const [classId, setClassId] = useState(focus?.classId ?? classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [kind, setKind] = useState<"note" | "parent">(defaultKind);
  const [text, setText] = useState("");
  const roster = students.filter((s) => s.classId === classId);
  const needsStudent = kind === "parent" && !studentId;

  const save = () => {
    if (!text.trim() || needsStudent) return;
    if (studentId) addStudentNote(studentId, kind, text.trim());
    else addNote(classId, text.trim());
    toast(kind === "parent" ? "Η επαφή με τον γονέα καταγράφηκε" : "Η σημείωση αποθηκεύτηκε");
    setText("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === "parent" ? "Επαφή με γονέα" : "Σημείωση"}
      footer={
        <Button className="w-full" onClick={save} disabled={!text.trim() || needsStudent}>
          Αποθήκευση
        </Button>
      }
    >
      <Segmented<"note" | "parent">
        value={kind}
        onChange={setKind}
        size="sm"
        options={[
          { value: "note", label: "Σημείωση" },
          { value: "parent", label: "Επαφή με γονέα" },
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Τμήμα">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudentId("");
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Μαθητής">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">{kind === "parent" ? "Διάλεξε…" : "Όλο το τμήμα"}</option>
            {roster.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={kind === "parent" ? "π.χ. Τηλεφώνημα με τη μητέρα: συμφωνήσαμε επιπλέον ασκήσεις την Παρασκευή." : "π.χ. Χρειάζεται επιπλέον εξάσκηση στην προπαίδεια."}
        className={cx(inputClass, "mt-3 py-2.5")}
        aria-label="Κείμενο"
      />
      <p className="mt-1.5 text-xs text-muted">Μπορείς να υπαγορεύσεις με το μικρόφωνο του πληκτρολογίου.</p>
    </Sheet>
  );
}

function Action({ icon, title, sub, href, onClick, wide }: { icon: ReactNode; title: string; sub: string; href?: string; onClick?: () => void; wide?: boolean }) {
  const cls = clsx(
    "grid gap-1.5 rounded-2xl border border-line bg-bg p-3 text-left transition-colors hover:bg-line-2",
    wide && "col-span-2 flex items-center gap-3",
  );
  const body = (
    <>
      <span className="text-brand-500 [&>svg]:size-[22px]">{icon}</span>
      <span className="grid gap-0.5">
        <span className="text-[14px] font-bold">{title}</span>
        <span className="text-[12px] text-muted">{sub}</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} onClick={onClick} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** The "+" sheet: every quick capture in one place. */
export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const focus = useFocusLesson();
  const subject = useApp((s) => s.subjects.find((x) => x.id === focus?.subjectId));
  const cls = useApp((s) => s.classes.find((x) => x.id === focus?.classId));
  const today = useApp((s) => s.today);
  const [note, setNote] = useState<null | "note" | "parent">(null);

  return (
    <>
      <Sheet open={open && !note} onClose={onClose} title="Τι θες να σημειώσεις;">
        <div className="grid grid-cols-2 gap-2">
          <Action
            icon={<NotebookPen />}
            title="Τι διδάχθηκε"
            sub={focus ? `${subject?.name} · ${focus.start}` : "Κανένα μάθημα"}
            href={focus ? `/lessons/${focus.id}` : "/schedule"}
            onClick={onClose}
          />
          <Action
            icon={<UserCheck />}
            title="Απουσίες"
            sub={cls ? `${cls.name} · σήμερα` : "Διάλεξε τμήμα"}
            href={cls ? `/classes/${cls.id}?date=${today}` : "/classes"}
            onClick={onClose}
          />
          <Action icon={<MessageSquareText />} title="Σημείωση" sub="Για μαθητή ή τμήμα" onClick={() => setNote("note")} />
          <UploadTrigger camera className="grid gap-1.5 rounded-2xl border border-line bg-bg p-3 text-left transition-colors hover:bg-line-2">
            <span className="text-brand-500">
              <Camera className="size-[22px]" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-[14px] font-bold">Σάρωση σελίδας</span>
              <span className="text-[12px] text-muted">Γίνεται φύλλο εργασίας</span>
            </span>
          </UploadTrigger>
          <Action icon={<PhoneCall />} title="Επαφή με γονέα" sub="Τηλέφωνο, συνάντηση · τι συμφωνήθηκε" onClick={() => setNote("parent")} wide />
          <Action icon={<Sparkles />} title="Νέο υλικό με AI" sub="Φύλλο, τεστ, σχέδιο μαθήματος, περίληψη" href="/materials/new" onClick={onClose} wide />
        </div>
      </Sheet>
      {note && (
        <NoteSheet
          open
          defaultKind={note}
          onClose={() => {
            setNote(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
