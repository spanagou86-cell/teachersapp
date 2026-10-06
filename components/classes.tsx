"use client";

import { Trash2, UserPlus, X } from "@/components/icons";
import { useState } from "react";
import { GRADES } from "@/lib/grades";
import { useApp } from "@/lib/store";
import type { ClassGroup } from "@/lib/types";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Select, Sheet } from "./ui";
import { AutoText, GrowingTextarea } from "./text";
import { RosterImport } from "./roster";
import type { RosterName } from "@/lib/ai/client";
import { confirmAction } from "./confirm";

/** Create a class, or edit one: name, grade, room, students. */
export function ClassSheet({ open, onClose, cls }: { open: boolean; onClose: () => void; cls?: ClassGroup }) {
  const all = useApp((s) => s.students);
  const addClass = useApp((s) => s.addClass);
  const updateClass = useApp((s) => s.updateClass);
  const deleteClass = useApp((s) => s.deleteClass);
  const addStudents = useApp((s) => s.addStudents);
  const removeStudent = useApp((s) => s.removeStudent);
  const renameStudent = useApp((s) => s.renameStudent);
  const [name, setName] = useState(cls?.name ?? "");
  const [grade, setGrade] = useState(cls?.grade ?? GRADES[3]);
  const [room, setRoom] = useState(cls?.room ?? "");
  const [newNames, setNewNames] = useState("");
  const [records, setRecords] = useState<RosterName[]>([]);
  const addStudentRecords = useApp((s) => s.addStudentRecords);
  const roster = cls ? all.filter((s) => s.classId === cls.id) : [];

  const save = () => {
    const names = newNames.split(/\n/);
    if (cls) {
      updateClass({ ...cls, name: name.trim(), grade, room: room.trim() });
      addStudents(cls.id, names);
    } else {
      const id = addClass({ name: name.trim(), grade, room: room.trim() });
      addStudents(id, names);
      addStudentRecords(id, records);
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
              aria-label="Διαγραφή τμήματος"
              onClick={async () => {
                const yes = await confirmAction({
                  title: `Διαγραφή του τμήματος ${cls.name};`,
                  text: "Σβήνονται οριστικά οι μαθητές, οι παρουσίες, τα μαθήματα και το υλικό του τμήματος. Δεν αναιρείται.",
                  action: "Διαγραφή",
                  danger: true,
                });
                if (!yes) return;
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
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Μαθητές · {roster.length} <span className="font-normal text-muted">· πάτα σε όνομα για διόρθωση</span></p>
          <ul className="divide-y divide-line-2 rounded-xl border border-line">
            {roster.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-1.5 py-1 text-sm">
                <AutoText
                  value={`${s.firstName} ${s.lastName}`.trim()}
                  onSave={(v) => {
                    const [first, ...rest] = v.replace(/\s+/g, " ").split(" ");
                    renameStudent({ ...s, firstName: first.slice(0, 60), lastName: rest.join(" ").slice(0, 60) });
                  }}
                  label={`Όνομα μαθητή: ${s.firstName} ${s.lastName}`}
                  maxLength={120}
                  className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-1.5 outline-none hover:bg-line-2 focus:bg-line-2"
                />
                <button
                  type="button"
                  aria-label={`Αφαίρεση: ${s.firstName} ${s.lastName}`}
                  onClick={() => {
                    const undo = removeStudent(s.id);
                    toast(`Αφαιρέθηκε: ${s.firstName} ${s.lastName}`, undo && { label: "Αναίρεση", run: undo });
                  }}
                  className="flex size-9 items-center justify-center rounded-lg text-muted hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 grid gap-2">
        <p className="text-[13px] font-semibold text-ink-2">{cls ? "Πρόσθεσε μαθητές" : "Μαθητές"}</p>
        <RosterImport
          className={name}
          onAdd={(list) => {
            // An existing class gets them at once; a new one when it is saved.
            if (cls) addStudentRecords(cls.id, list);
            else setRecords((r) => [...r, ...list]);
          }}
        />
        {!cls && records.length > 0 && (
          <p className="text-[13px] text-brand-700">
            {records.length} μαθητές από τη φωτογραφία θα προστεθούν με την αποθήκευση.
          </p>
        )}
        <GrowingTextarea
          value={newNames}
          onChange={(e) => setNewNames(e.target.value)}
          rows={3}
          aria-label="Ονόματα μαθητών"
          placeholder={"Ή γράψε ένα όνομα ανά γραμμή, π.χ.\nΜαρία Κωνσταντίνου"}
          className={cx(inputClass, "py-2.5")}
        />
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <UserPlus className="size-3.5" /> Μπορείς να επικολλήσεις λίστα από το Excel ή το myschool.
        </p>
      </div>
    </Sheet>
  );
}
