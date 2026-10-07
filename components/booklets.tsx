"use client";

import { CloudUpload, FileText, Loader2, Printer, Trash2, X } from "@/components/icons";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { shrinkImage } from "@/lib/ai/client";
import { guessSubject, titleFromFileName } from "@/lib/materials";
import { pdfFromImages } from "@/lib/pdfFromImages";
import { printable, printFile } from "@/lib/printFile";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { subjectChoices } from "@/lib/subjects";
import type { Material, SubjectId } from "@/lib/types";
import { FileBadge, SubjectIcon } from "./subject";
import { toast } from "./toast";
import { Button, Card, cx, EmptyState, Field, IconButton, inputClass, Select, Sheet } from "./ui";
import { ingestFile } from "./upload";

/** Booklets are the teacher's own printed sheets (φυλλάδια), kept to print again whenever needed. */
export const isBooklet = (m: Material) => m.kind === "file" && !!m.file;

export const useBookletSheet = create<{ open: boolean; subjectId?: SubjectId; set: (open: boolean, subjectId?: SubjectId) => void }>((set) => ({
  open: false,
  set: (open, subjectId) => set({ open, subjectId }),
}));
export const openBookletSheet = (subjectId?: SubjectId) => useBookletSheet.getState().set(true, subjectId);

const ACCEPT = "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic";
const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

function UploadBody({ onClose, initialSubject }: { onClose: () => void; initialSubject?: SubjectId }) {
  const subjects = useSubjects();
  const classes = useApp((s) => s.classes);
  const createMaterial = useApp((s) => s.createMaterial);
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<SubjectId | "">(initialSubject ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const pdfs = files.filter(isPdf);
  const images = files.filter(isImage);
  const problem = pdfs.length > 1 || (pdfs.length && images.length) ? "Διάλεξε ένα PDF ή φωτογραφίες (μία ανά σελίδα), όχι και τα δύο." : "";

  const pick = (list: FileList | null) => {
    const next = [...files, ...Array.from(list ?? [])].filter((f) => isPdf(f) || isImage(f)).slice(0, 40);
    setFiles(next);
    if (!title && next[0]) setTitle(titleFromFileName(next[0].name));
    if (!subjectId && next[0]) setSubjectId(guessSubject(next[0].name) ?? "");
  };

  const save = async () => {
    if (!files.length || !subjectId || !classId || problem) return;
    setBusy(true);
    try {
      const name = title.trim() || "Φυλλάδιο";
      let file = pdfs[0];
      if (!file) {
        // Photos of the pages → one PDF, so the booklet prints in one go.
        const shrunk = await Promise.all(images.map((f) => shrinkImage(f, 2200, 0.85)));
        const pdf = await pdfFromImages(shrunk, name);
        file = new File([pdf], `${name}.pdf`, { type: "application/pdf" });
      }
      const r = await ingestFile(file);
      if ("error" in r) return toast(r.error);
      createMaterial({ title: name.slice(0, 200), classId, subjectId, kind: "file", level: "standard", withSolutions: false, file: r.meta, blocks: [] });
      onClose();
      toast(`Το φυλλάδιο «${name}» αποθηκεύτηκε`);
    } catch {
      toast("Δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Νέο φυλλάδιο"
      footer={
        <div className="pb-3">
          <Button className="h-11 w-full" onClick={save} disabled={busy || !files.length || !subjectId || !classId || !!problem}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />} Αποθήκευση
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <p className="text-sm text-muted">Ανέβασε το PDF ή φωτογράφισε τις σελίδες: θα μείνει εδώ για να το τυπώνεις όποτε το χρειάζεσαι.</p>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-bg px-4 py-5 text-center hover:border-brand-100 hover:bg-brand-50/40"
        >
          <CloudUpload className="size-6 text-brand-500" />
          <span className="font-semibold">{files.length ? "Πρόσθεσε κι άλλες σελίδες" : "Διάλεξε PDF ή φωτογραφίες"}</span>
          <span className="text-[13px] text-muted">Πολλές φωτογραφίες γίνονται ένα PDF, με τη σειρά που τις διαλέγεις</span>
        </button>
        <input
          ref={ref}
          type="file"
          hidden
          multiple
          accept={ACCEPT}
          onChange={(e) => (pick(e.target.files), (e.target.value = ""))}
          aria-label="Αρχεία φυλλαδίου"
        />
        {files.length > 0 && (
          <ul className="grid grid-cols-1 gap-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <IconButton label={`Αφαίρεση: ${f.name}`} onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="size-8">
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        {problem && <p className="text-sm text-danger">{problem}</p>}
        <Field label="Τίτλος">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="π.χ. Φυλλάδιο κλασμάτων"
            className={cx(inputClass, "h-11")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <Field label="Μάθημα">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value as SubjectId)} aria-label="Μάθημα">
              <option value="" disabled>
                Διάλεξε…
              </option>
              {subjectChoices(subjects, subjectId || undefined).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Τμήμα">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Τμήμα">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.grade}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

export function BookletSheet() {
  const open = useBookletSheet((s) => s.open);
  const subjectId = useBookletSheet((s) => s.subjectId);
  const set = useBookletSheet((s) => s.set);
  if (!open) return null;
  return <UploadBody initialSubject={subjectId} onClose={() => set(false)} />;
}

/** «Εκτύπωση» right from the list: the printer dialog, where the number of copies is chosen. */
export function PrintButton({ material, compact }: { material: Material; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  if (!printable(material.file)) return null;
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={busy}
      aria-label={`Εκτύπωση: ${material.title}`}
      onClick={async () => {
        setBusy(true);
        const r = await printFile(material.file!);
        setBusy(false);
        if (!r.ok) toast(r.error);
        else if (r.hint) toast(r.hint);
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
      {!compact && <span className="max-sm:hidden">Εκτύπωση</span>}
    </Button>
  );
}

/** The booklets, by subject: Ελληνικά, Μαθηματικά… each with its print button. */
export function Booklets({ classId, subject, q }: { classId: string; subject: SubjectId | "all"; q: string }) {
  const materials = useApp((s) => s.materials);
  const classes = useApp((s) => s.classes);
  const del = useApp((s) => s.deleteMaterial);
  const subjects = useSubjects();
  const term = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      materials
        .filter(isBooklet)
        .filter((m) => (subject === "all" || m.subjectId === subject) && (classId === "all" || m.classId === classId))
        .filter((m) => !term || m.title.toLowerCase().includes(term))
        .sort((a, b) => a.title.localeCompare(b.title, "el")),
    [materials, subject, classId, term],
  );
  const groups = subjects.map((s) => ({ subject: s, items: list.filter((m) => m.subjectId === s.id) })).filter((g) => g.items.length);

  if (!list.length)
    return (
      <Card>
        <EmptyState
          icon={<FileText className="size-6" />}
          title={materials.some(isBooklet) ? "Δεν βρέθηκε φυλλάδιο" : "Τα φυλλάδιά σου, πάντα έτοιμα για φωτοτυπία"}
          text={
            materials.some(isBooklet)
              ? "Δοκίμασε άλλη λέξη, μάθημα ή τμήμα."
              : "Ανέβασε τα φυλλάδια κάθε τάξης μία φορά και τύπωσέ τα με ένα πάτημα όποτε τα χρειαστείς."
          }
          action={
            <Button onClick={() => openBookletSheet(subject === "all" ? undefined : subject)}>
              <CloudUpload className="size-4" /> Νέο φυλλάδιο
            </Button>
          }
        />
      </Card>
    );

  return (
    <div className="grid grid-cols-1 gap-5">
      {groups.map(({ subject: s, items }) => (
        <section key={s.id} className="grid grid-cols-1 gap-2" aria-label={s.name}>
          <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-muted">
            <SubjectIcon id={s.id} size="sm" /> {s.name}
            <span className="font-semibold tabular-nums">· {items.length}</span>
          </h2>
          <Card>
            <ul className="divide-y divide-line-2">
              {items.map((m) => (
                <li key={m.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
                  <FileBadge file={m.file} />
                  <Link href={`/materials/${m.id}`} className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-semibold leading-snug group-hover:underline">{m.title}</span>
                    <span className="block text-[13px] text-muted">{classes.find((c) => c.id === m.classId)?.name}</span>
                  </Link>
                  <PrintButton material={m} />
                  <button
                    type="button"
                    aria-label={`Διαγραφή: ${m.title}`}
                    onClick={() => {
                      const undo = del(m.id);
                      toast("Το φυλλάδιο διαγράφηκε", undo && { label: "Αναίρεση", run: undo });
                    }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-line-2 hover:text-danger hover-capable:opacity-0 hover-capable:group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
