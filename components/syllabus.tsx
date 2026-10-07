"use client";

import { BookOpenCheck, Camera, FileText, Loader2, Pencil, Plus, Sparkles, X } from "@/components/icons";
import { useRef, useState } from "react";
import { create } from "zustand";
import { aiReadSyllabus, shrinkImage, toBase64 } from "@/lib/ai/client";
import { shortDate } from "@/lib/dates";
import { GRADES } from "@/lib/grades";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { subjectChoices } from "@/lib/subjects";
import { parseList, totalPeriods, type SyllabusItem } from "@/lib/syllabus";
import { TOPICS } from "@/lib/seed";
import type { SubjectId } from "@/lib/types";
import { toast } from "./toast";
import { Button, cx, IconButton, inputClass, Select, Sheet } from "./ui";

export const useSyllabus = create<{ open: boolean; classId?: string; subjectId?: SubjectId; show: (o?: { classId?: string; subjectId?: SubjectId }) => void; hide: () => void }>((set) => ({
  open: false,
  show: (o = {}) => set({ open: true, ...o }),
  hide: () => set({ open: false, classId: undefined, subjectId: undefined }),
}));

/** Opens «Ύλη μαθήματος» for a class and subject. */
export const openSyllabus = (o?: { classId?: string; subjectId?: SubjectId }) => useSyllabus.getState().show(o);

function Body({ onClose }: { onClose: () => void }) {
  const init = useSyllabus.getState();
  const mode = useApp((s) => s.mode);
  const classes = useApp((s) => s.classes);
  const country = useApp((s) => s.profile.country);
  const today = useApp((s) => s.today);
  const spreadSyllabus = useApp((s) => s.spreadSyllabus);
  const subjects = useSubjects();
  const [classId, setClassId] = useState(init.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<SubjectId>(init.subjectId ?? "math");
  const [items, setItems] = useState<SyllabusItem[] | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "read" | "apply">("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cls = classes.find((c) => c.id === classId);
  const gradeIndex = cls ? GRADES.indexOf(cls.grade) : -1;
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const official = country === "cy" && subjectId === "math" && gradeIndex >= 0 && gradeIndex <= 5;

  /** The demo has no model: the built-in example topics stand in for what the AI would read. */
  const sample = (): SyllabusItem[] =>
    (TOPICS[subjectId] ?? TOPICS.glossa ?? []).filter((t) => !/^Επανάληψη/.test(t)).map((title) => ({ title, periods: 2 }));

  const read = async (source: "cy-maths" | "file", file?: File) => {
    setBusy("read");
    setNote("");
    try {
      if (mode !== "cloud") {
        await new Promise((r) => setTimeout(r, 700));
        setItems(sample());
        setNote("Στην επίδειξη βλέπεις δείγμα. Με λογαριασμό το AI διαβάζει την πραγματική ύλη.");
        return;
      }
      let payload: { data: string; mediaType: string } | undefined;
      if (file) {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const blob = isPdf ? file : await shrinkImage(file, 2000, 0.85);
        if (blob.size > 4_000_000) return toast("Το αρχείο είναι μεγάλο. Δοκίμασε φωτογραφία ή PDF λίγων σελίδων.");
        const mediaType = isPdf ? "application/pdf" : ["image/jpeg", "image/png", "image/webp"].includes(blob.type) ? blob.type : "";
        if (!mediaType) return toast("Αυτή η φωτογραφία δεν διαβάζεται. Τράβηξέ τη ξανά από την κάμερα.");
        payload = { data: await toBase64(blob), mediaType };
      }
      const r = await aiReadSyllabus({ source, grade: gradeIndex, file: payload, subject: subjectName, gradeLabel: cls?.grade ?? "" });
      if (!r.ok) return toast(r.error);
      setItems(r.data.items);
      setNote(r.data.notes?.trim() ?? "");
    } finally {
      setBusy("");
    }
  };

  const apply = async () => {
    if (!items?.length || !classId) return;
    setBusy("apply");
    try {
      const r = await spreadSyllabus(classId, subjectId, items, today);
      if (!r.count) return toast(`Δεν υπάρχουν μαθήματα ${subjectName} για το ${cls?.name} από σήμερα. Έλεγξε το ωρολόγιο.`);
      onClose();
      toast(`Θέμα σε ${r.count} μαθήματα${r.until ? `, ως ${shortDate(r.until)}` : ""}${r.left ? ` · ${r.left} θέματα δεν χώρεσαν` : ""}`, { label: "Αναίρεση", run: r.undo });
    } catch {
      toast("Δεν ολοκληρώθηκε. Έλεγξε τη σύνδεση και δοκίμασε ξανά.");
    } finally {
      setBusy("");
    }
  };

  const patch = (i: number, p: Partial<SyllabusItem>) => setItems((xs) => xs && xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const source = "flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left shadow-card transition-colors hover:border-brand-100 hover:bg-brand-50/50 disabled:opacity-60";

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ύλη μαθήματος"
      footer={
        items ? (
          <div className="grid gap-2 pb-3">
            <Button onClick={apply} disabled={busy !== "" || !items.length}>
              {busy === "apply" ? <Loader2 className="size-4 animate-spin" /> : <BookOpenCheck className="size-4" />} Μοίρασε στα μαθήματα από σήμερα
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Τμήμα">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.grade}
              </option>
            ))}
          </Select>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value as SubjectId)} aria-label="Μάθημα">
            {subjectChoices(subjects, subjectId).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        {!items ? (
          <>
            <p className="text-sm text-muted">Δώσε μία φορά τη σειρά των θεμάτων. Μπαίνουν μόνα τους στα επόμενα μαθήματα, και όταν ένα μάθημα δεν γίνει, προχωρούν όλα μία ώρα.</p>
            {official && (
              <button type="button" className={source} disabled={busy !== ""} onClick={() => void read("cy-maths")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  {busy === "read" ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                </span>
                <span>
                  <span className="block font-semibold">Επίσημος προγραμματισμός ΥΠΑΝ</span>
                  <span className="block text-[13px] text-muted">Μαθηματικά {cls?.grade.replace(" Δημοτικού", "")} 2026–27, με τις περιόδους κάθε ενότητας</span>
                </span>
              </button>
            )}
            <button type="button" className={source} disabled={busy !== ""} onClick={() => fileRef.current?.click()}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                {busy === "read" && !official ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
              </span>
              <span>
                <span className="block font-semibold">Φωτογραφία των περιεχομένων</span>
                <span className="block text-[13px] text-muted">Του βιβλίου ή του προγραμματισμού σου (εικόνα ή PDF)</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/heic,.pdf,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void read("file", f);
              }}
            />
            {typing ? (
              <div className="grid gap-2">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  maxLength={8000}
                  aria-label="Θέματα, ένα σε κάθε γραμμή"
                  placeholder={"Ενότητα 1:\nΑριθμοί ως το 10 000 (3)\nΣτρογγυλοποίηση (2)\nΕνότητα 2:\nΚλάσματα (4)"}
                  className={cx(inputClass, "py-2.5")}
                />
                <Button variant="secondary" disabled={!parseList(text).length} onClick={() => setItems(parseList(text))}>
                  Συνέχεια
                </Button>
              </div>
            ) : (
              <button type="button" className={source} onClick={() => setTyping(true)}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  <Pencil className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">Γράψε ή επικόλλησε</span>
                  <span className="block text-[13px] text-muted">Ένα θέμα σε κάθε γραμμή, με τις περιόδους σε παρένθεση</span>
                </span>
              </button>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted" />
              <b>{items.length} θέματα</b> · {totalPeriods(items)} περίοδοι · έλεγξέ τα πριν τα μοιράσεις
            </p>
            {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-ink-2">{note}</p>}
            <ol className="grid grid-cols-1 gap-1.5">
              {items.map((it, i) => (
                <li key={i} className="grid min-w-0 grid-cols-1 gap-1 rounded-xl border border-line bg-surface p-2">
                  {it.unit && (i === 0 || items[i - 1].unit !== it.unit) && <span className="px-1 text-[12px] font-semibold text-brand-700">{it.unit}</span>}
                  <div className="flex items-center gap-1.5">
                    <input
                      value={it.title}
                      onChange={(e) => patch(i, { title: e.target.value.slice(0, 160) })}
                      aria-label={`Θέμα ${i + 1}`}
                      className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-1.5 text-base outline-none focus:bg-line-2 sm:text-sm"
                    />
                    <input
                      value={it.periods}
                      inputMode="numeric"
                      onChange={(e) => patch(i, { periods: Math.max(1, Math.min(40, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
                      aria-label={`Περίοδοι θέματος ${i + 1}`}
                      className={cx(inputClass, "h-10 !w-14 shrink-0 px-1 text-center tabular-nums")}
                    />
                    <IconButton label={`Αφαίρεση θέματος ${i + 1}`} onClick={() => setItems((xs) => xs && xs.filter((_, j) => j !== i))}>
                      <X className="size-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setItems((xs) => [...(xs ?? []), { title: "Νέο θέμα", periods: 1, unit: xs?.at(-1)?.unit }])}>
                <Plus className="size-4" /> Θέμα
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setItems(null)}>
                Άλλη πηγή
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Mounted once by the app shell. */
export function SyllabusSheet() {
  const open = useSyllabus((s) => s.open);
  const hide = useSyllabus((s) => s.hide);
  if (!open) return null;
  return <Body onClose={hide} />;
}
