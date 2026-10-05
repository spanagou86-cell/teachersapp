"use client";

import { AlertTriangle, Trash2 } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dayName, shortDate, timeToMin } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { isValidTime } from "@/lib/timetable";
import type { LessonSlot, SubjectId } from "@/lib/types";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Select, Sheet } from "./ui";

const addMinutes = (t: string, m: number) => {
  const total = timeToMin(t) + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * One form for a single lesson: change its day, time, class or subject, or add an extra
 * lesson outside the timetable. Overlaps with other lessons or duties are refused.
 */
export function LessonSheet({ open, onClose, slot, date }: { open: boolean; onClose: () => void; slot?: LessonSlot; date?: string }) {
  const router = useRouter();
  const classes = useApp((s) => s.classes);
  const subjects = useApp((s) => s.subjects);
  const today = useApp((s) => s.today);
  const editSlot = useApp((s) => s.editSlot);
  const addSlot = useApp((s) => s.addSlot);
  const deleteSlot = useApp((s) => s.deleteSlot);
  const restoreSlot = useApp((s) => s.restoreSlot);

  const [day, setDay] = useState(slot?.date ?? date ?? today);
  const [start, setStart] = useState(slot?.start ?? "08:15");
  const [end, setEnd] = useState(slot?.end ?? "09:00");
  const [classId, setClassId] = useState(slot?.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<SubjectId>(slot?.subjectId ?? "glossa");
  const [topic, setTopic] = useState("");
  const [problem, setProblem] = useState("");

  const validTimes = isValidTime(start) && isValidTime(end) && timeToMin(end) > timeToMin(start);
  const valid = Boolean(day) && validTimes && Boolean(classId);

  const save = () => {
    if (!valid) return;
    const patch = { date: day, start, end, classId, subjectId };
    const r = slot ? editSlot(slot.id, patch) : addSlot({ ...patch, topic: topic.trim() });
    if (!r.ok) {
      setProblem(
        r.conflicts.length
          ? `Την ώρα αυτή έχεις ήδη κάτι άλλο (${r.conflicts.map((c) => `${c.start}–${c.end}`).join(", ")}). Διάλεξε άλλη ώρα.`
          : "Δεν αποθηκεύτηκε.",
      );
      return;
    }
    toast(slot ? "Το μάθημα άλλαξε" : `Προστέθηκε: ${dayName(day)} ${shortDate(day)} · ${start}`);
    onClose();
    if (!slot && "id" in r) router.push(`/lessons/${r.id}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={slot ? "Επεξεργασία μαθήματος" : "Έκτακτο μάθημα"}
      footer={
        <div className="flex gap-2">
          {slot && (
            <Button
              variant="danger"
              aria-label="Διαγραφή μαθήματος"
              onClick={() => {
                if (!confirm("Να διαγραφεί αυτό το μάθημα; Οι σημειώσεις του θα χαθούν.")) return;
                const removed = deleteSlot(slot.id);
                onClose();
                router.replace("/schedule");
                if (removed) toast("Το μάθημα διαγράφηκε", { label: "Αναίρεση", run: () => restoreSlot(removed) });
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button className="h-11 flex-1" onClick={save} disabled={!valid}>
            {slot ? "Αποθήκευση" : "Προσθήκη μαθήματος"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <Field label="Ημερομηνία">
          <input type="date" value={day} onChange={(e) => (setDay(e.target.value), setProblem(""))} className={cx(inputClass, "h-11")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Έναρξη">
            <input
              type="time"
              value={start}
              onChange={(e) => {
                const v = e.target.value;
                // Keep the same length when the start moves.
                if (isValidTime(start) && isValidTime(end) && isValidTime(v)) setEnd(addMinutes(v, timeToMin(end) - timeToMin(start)));
                setStart(v);
                setProblem("");
              }}
              className={cx(inputClass, "h-11")}
            />
          </Field>
          <Field label="Λήξη">
            <input type="time" value={end} onChange={(e) => (setEnd(e.target.value), setProblem(""))} className={cx(inputClass, "h-11", !validTimes && "border-danger")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Τμήμα">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Μάθημα">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value as SubjectId)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {!slot && (
          <Field label="Θέμα (προαιρετικό)">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="π.χ. Επανάληψη κεφαλαίου 3" className={cx(inputClass, "h-11")} />
          </Field>
        )}
        {!validTimes && <p className="text-sm text-danger">Η λήξη πρέπει να είναι μετά την έναρξη.</p>}
        {problem && (
          <p role="alert" className="flex gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {problem}
          </p>
        )}
        {slot && <p className="text-[13px] text-muted">Η αλλαγή αφορά μόνο αυτό το μάθημα. Για όλες τις εβδομάδες άλλαξε το ωρολόγιο πρόγραμμα.</p>}
      </div>
    </Sheet>
  );
}
