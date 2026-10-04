"use client";

import { Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { GRADES } from "@/lib/grades";
import { useApp } from "@/lib/store";
import type { ClassGroup } from "@/lib/types";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Select, Sheet } from "./ui";

/** Create a class, or edit one: name, grade, room, students. */
export function ClassSheet({ open, onClose, cls }: { open: boolean; onClose: () => void; cls?: ClassGroup }) {
  const all = useApp((s) => s.students);
  const addClass = useApp((s) => s.addClass);
  const updateClass = useApp((s) => s.updateClass);
  const deleteClass = useApp((s) => s.deleteClass);
  const addStudents = useApp((s) => s.addStudents);
  const removeStudent = useApp((s) => s.removeStudent);
  const [name, setName] = useState(cls?.name ?? "");
  const [grade, setGrade] = useState(cls?.grade ?? GRADES[3]);
  const [room, setRoom] = useState(cls?.room ?? "");
  const [newNames, setNewNames] = useState("");
  const roster = cls ? all.filter((s) => s.classId === cls.id) : [];

  const save = () => {
    const names = newNames.split(/\n|,/);
    if (cls) {
      updateClass({ ...cls, name: name.trim(), grade, room: room.trim() });
      addStudents(cls.id, names);
    } else {
      const id = addClass({ name: name.trim(), grade, room: room.trim() });
      addStudents(id, names);
    }
    toast(cls ? "Το τμήμα ενημερώθηκε" : "Το τμήμα δημιουργήθηκε");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={cls ? `Τμήμα ${cls.name}` : "Νέο τμήμα"}
      footer={
        <div className="flex gap-2">
          {cls && (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm(`Διαγραφή του τμήματος ${cls.name}; Θα σβηστούν οι μαθητές, οι παρουσίες, τα μαθήματα και το υλικό του.`)) return;
                deleteClass(cls.id);
                toast("Το τμήμα διαγράφηκε");
                onClose();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button className="flex-1" disabled={!name.trim()} onClick={save}>
            Αποθήκευση
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Όνομα">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="π.χ. Δ1" className={cx(inputClass, "h-10")} />
        </Field>
        <Field label="Τάξη">
          <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Αίθουσα" className="mt-3">
        <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={60} placeholder="π.χ. Αίθουσα 3" className={cx(inputClass, "h-10")} />
      </Field>
      {roster.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Μαθητές · {roster.length}</p>
          <ul className="max-h-48 divide-y divide-line-2 overflow-y-auto rounded-xl border border-line">
            {roster.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="flex-1">
                  {s.firstName} {s.lastName}
                </span>
                <button
                  type="button"
                  aria-label={`Αφαίρεση: ${s.firstName} ${s.lastName}`}
                  onClick={() => confirm(`Αφαίρεση του/της ${s.firstName} ${s.lastName};`) && removeStudent(s.id)}
                  className="text-muted hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label={cls ? "Πρόσθεσε μαθητές" : "Μαθητές"} className="mt-4">
        <textarea value={newNames} onChange={(e) => setNewNames(e.target.value)} rows={4} placeholder={"Ένα όνομα ανά γραμμή"} className={cx(inputClass, "py-2.5")} />
      </Field>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <UserPlus className="size-3.5" /> Μπορείς να επικολλήσεις λίστα από το Excel.
      </p>
    </Sheet>
  );
}
