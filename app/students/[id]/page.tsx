"use client";

import clsx from "clsx";
import { Clock, MessageSquareText, PhoneCall, Trash2, UserRound, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Avatar, Button, ButtonLink, Card, cx, EmptyState, inputClass, Segmented } from "@/components/ui";
import { longDate } from "@/lib/dates";
import { useApp } from "@/lib/store";

type Item =
  | { type: "note" | "parent"; id: string; date: string; text: string }
  | { type: "absent" | "late"; id: string; date: string };

const ICON = { note: MessageSquareText, parent: PhoneCall, absent: UserX, late: Clock };
const LABEL = { note: "Σημείωση", parent: "Επαφή με γονέα", absent: "Απουσία", late: "Καθυστέρηση" };

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const student = useApp((s) => s.students.find((x) => x.id === id));
  const cls = useApp((s) => s.classes.find((c) => c.id === student?.classId));
  const allNotes = useApp((s) => s.studentNotes);
  const attendance = useApp((s) => s.attendance);
  const addNote = useApp((s) => s.addStudentNote);
  const delNote = useApp((s) => s.deleteStudentNote);
  const editNote = useApp((s) => s.editStudentNote);
  const restoreNote = useApp((s) => s.restoreStudentNote);
  const [kind, setKind] = useState<"note" | "parent">("note");
  const [text, setText] = useState("");

  const items = useMemo<Item[]>(() => {
    if (!student) return [];
    const out: Item[] = allNotes.filter((n) => n.studentId === student.id).map((n) => ({ type: n.kind, id: n.id, date: n.date, text: n.text }));
    for (const [key, r] of Object.entries(attendance)) {
      const [classId, date] = key.split("|");
      if (classId !== student.classId) continue;
      if (r.absentIds.includes(student.id)) out.push({ type: "absent", id: `a-${date}`, date });
      if (r.lateIds?.includes(student.id)) out.push({ type: "late", id: `l-${date}`, date });
    }
    return out.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  }, [student, allNotes, attendance]);

  if (!student || !cls)
    return <EmptyState icon={<UserRound className="size-6" />} title="Ο μαθητής δεν βρέθηκε" action={<ButtonLink href="/classes">Τάξεις</ButtonLink>} />;

  const name = `${student.firstName} ${student.lastName}`.trim();
  const absences = items.filter((i) => i.type === "absent").length;
  const lates = items.filter((i) => i.type === "late").length;
  const contacts = items.filter((i) => i.type === "parent").length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={`/classes/${cls.id}?tab=students`}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} seed={2} size="lg" /> {name}
          </span>
        }
        subtitle={
          <Link href={`/classes/${cls.id}`} className="hover:underline">
            {cls.name} · {cls.grade}
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { n: absences, label: absences === 1 ? "απουσία" : "απουσίες", cls: "text-danger" },
          { n: lates, label: lates === 1 ? "καθυστέρηση" : "καθυστερήσεις", cls: "text-amber" },
          { n: contacts, label: contacts === 1 ? "επαφή με γονέα" : "επαφές με γονείς", cls: "text-info" },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-line bg-surface px-3 py-2.5">
            <p className={cx("text-2xl font-extrabold leading-none tabular-nums", x.cls)}>{x.n}</p>
            <p className="mt-1 text-[12px] text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      <Card className="mb-6 p-4">
        <Segmented<"note" | "parent">
          value={kind}
          onChange={setKind}
          size="sm"
          options={[
            { value: "note", label: "Σημείωση" },
            { value: "parent", label: "Επαφή με γονέα" },
          ]}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          aria-label="Νέα καταχώριση"
          placeholder={kind === "parent" ? "Τι συζητήθηκε και τι συμφωνήθηκε" : "Τι παρατήρησες σήμερα"}
          className={cx(inputClass, "mt-3 py-2.5")}
        />
        <div className="mt-2 flex justify-end">
          <Button
            disabled={!text.trim()}
            onClick={() => {
              addNote(student.id, kind, text.trim());
              setText("");
              toast(kind === "parent" ? "Η επαφή καταγράφηκε" : "Η σημείωση αποθηκεύτηκε");
            }}
          >
            Προσθήκη
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-muted">Χρονολόγιο</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Τίποτα ακόμη. Οι σημειώσεις, οι απουσίες και οι επαφές με τους γονείς θα εμφανίζονται εδώ.</p>
      ) : (
        <ol className="relative grid gap-3 border-l border-line pl-5">
          {items.map((it) => {
            const Icon = ICON[it.type];
            return (
              <li key={it.id} className="group relative">
                <span
                  className={clsx(
                    "absolute -left-[31px] top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-bg",
                    it.type === "absent" ? "bg-danger" : it.type === "late" ? "bg-amber" : it.type === "parent" ? "bg-info" : "bg-brand-500",
                  )}
                >
                  <Icon className="size-3 text-surface" />
                </span>
                <p className="text-[12px] font-semibold text-muted">
                  {longDate(it.date)} · {LABEL[it.type]}
                </p>
                {"text" in it && (
                  <div className="mt-1 flex gap-2">
                    <textarea
                      defaultValue={it.text}
                      aria-label="Κείμενο σημείωσης"
                      rows={Math.min(6, it.text.split("\n").length + Math.floor(it.text.length / 60))}
                      maxLength={2000}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) e.target.value = it.text;
                        else if (v !== it.text) {
                          editNote(it.id, v);
                          toast("Η σημείωση διορθώθηκε");
                        }
                      }}
                      className="flex-1 resize-none rounded-md bg-transparent text-[15px] outline-none focus:bg-line-2"
                    />
                    <button
                      type="button"
                      aria-label="Διαγραφή"
                      onClick={() => {
                        const n = allNotes.find((x) => x.id === it.id);
                        delNote(it.id);
                        if (n) toast("Διαγράφηκε", { label: "Αναίρεση", run: () => restoreNote(n) });
                      }}
                      className="flex size-9 shrink-0 items-center justify-center self-start rounded-lg text-muted hover:text-danger sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
