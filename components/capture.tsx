"use client";

import Link from "next/link";
import { useState } from "react";
import { timeToMin } from "@/lib/dates";
import { slotsOn, upcomingLesson } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { needsLog, useClock } from "./lesson";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Segmented, Select, Sheet } from "./ui";

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
  const noClass = !classId;

  const save = () => {
    if (!text.trim() || needsStudent || noClass) return;
    if (studentId) addStudentNote(studentId, kind, text.trim());
    else addNote(classId, text.trim());
    toast(kind === "parent" ? "Η επαφή με τον γονέα αποθηκεύτηκε" : "Η σημείωση αποθηκεύτηκε");
    setText("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === "parent" ? "Επαφή με γονέα" : "Σημείωση"}
      footer={
        <Button className="w-full" onClick={save} disabled={!text.trim() || needsStudent || noClass}>
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
      {noClass && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
          Πρόσθεσε πρώτα ένα τμήμα από τις{" "}
          <Link href="/classes" onClick={onClose} className="font-semibold text-brand underline">
            Τάξεις
          </Link>
          .
        </p>
      )}
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
