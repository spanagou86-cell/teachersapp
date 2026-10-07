"use client";

import clsx from "clsx";
import {
  ArrowRight, CalendarPlus, Check, CheckCircle2, ChevronDown, Download, Eye, FileQuestion, FileText, History, Link2Off, Paperclip, Plus, Redo2, RotateCcw, Sparkles, Trash2, Undo2, X,
} from "@/components/icons";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdaptPanel, type Suggestion } from "@/components/doc/AdaptPanel";
import { DocPage } from "@/components/doc/DocPage";
import { PrintButton } from "@/components/booklets";
import { BackButton } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, EmptyState, IconButton, Segmented, Select, Sheet, Toggle } from "@/components/ui";
import { openPrepare } from "@/components/prepare";
import { dayName, relativeTime, shortDate } from "@/lib/dates";
import { uid } from "@/lib/id";
import { exerciseNumber, fileKindLabel, KIND_LABEL, LEVEL_LABEL } from "@/lib/materials";
import { sortSlots } from "@/lib/schedule";
import { useDyslexia } from "@/lib/prefs";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { loadBlob } from "@/lib/store/blobs";
import { remote } from "@/lib/store/remote";
import type { Block, Material } from "@/lib/types";
import { subjectChoices } from "@/lib/subjects";

function OriginalView({ material }: { material: Material }) {
  const [url, setUrl] = useState<string>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let revoke: string | undefined;
    let cancelled = false;
    const file = material.file;
    if (file?.path) {
      // Private bucket: a short-lived link, only for the owner.
      void remote.signedUrl(file.path).then((u) => (cancelled ? undefined : u ? setUrl(u) : setMissing(true)));
    } else if (file?.blobKey) {
      void loadBlob(file.blobKey).then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      });
    } else setMissing(true);
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [material.file]);

  const file = material.file;
  if (!file || missing)
    return (
      <div>
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-line-2 px-3 py-2 text-sm text-muted">
          <FileQuestion className="size-4 shrink-0" />
          {!file
            ? "Χωρίς αρχείο. Βλέπεις το αρχικό περιεχόμενο."
            : file.path
              ? "Το αρχείο δεν άνοιξε αυτή τη στιγμή (έλεγξε τη σύνδεση). Βλέπεις το αρχικό περιεχόμενο πριν από τις αλλαγές."
              : "Δείγμα επίδειξης — δεν υπάρχει πραγματικό αρχείο. Βλέπεις το αρχικό περιεχόμενο πριν από τις αλλαγές."}
        </p>
        <DocPage material={material} blocks={material.originalBlocks} mode="view" />
      </div>
    );
  if (!url) return <div className="h-96 animate-pulse-soft rounded-2xl bg-line" />;
  const kind = fileKindLabel(file.type, file.name);
  if (kind === "Εικόνα")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={file.name} className="mx-auto max-h-[80vh] rounded-lg bg-white shadow-paper" />;
  if (kind === "PDF") return <iframe src={url} title={file.name} className="h-[75vh] w-full rounded-lg border border-line bg-white" />;
  return (
    <EmptyState
      icon={<FileText className="size-6" />}
      title={file.name}
      text="Η προεπισκόπηση αρχείων Word θα έρθει με τη μετατροπή στον server. Μπορείς να το κατεβάσεις."
      action={
        <a href={url} download={file.name} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-line-2">
          <Download className="size-4" /> Λήψη αρχείου
        </a>
      }
    />
  );
}

/** Class, subject and delete: the material's own details. */
function MaterialDetails({ material }: { material: Material }) {
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const patch = useApp((s) => s.patchMaterial);
  const remove = useApp((s) => s.deleteMaterial);
  const dyslexia = useDyslexia((s) => s.ids.includes(material.id));
  const setDyslexia = useDyslexia((s) => s.set);
  const router = useRouter();
  return (
    <Card className="grid gap-3 p-5">
      <h2 className="text-[15px] font-bold">Στοιχεία</h2>
      <div className="grid grid-cols-2 gap-2">
        <Select value={material.classId} onChange={(e) => patch(material.id, { classId: e.target.value })} aria-label="Τμήμα">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.grade}
            </option>
          ))}
        </Select>
        <Select value={material.subjectId} onChange={(e) => patch(material.id, { subjectId: e.target.value as Material["subjectId"] })} aria-label="Μάθημα υλικού">
          {subjectChoices(subjects, material.subjectId).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
      </div>
      {material.kind !== "file" && (
        <>
          <Select value={material.kind} onChange={(e) => patch(material.id, { kind: e.target.value as Material["kind"] })} aria-label="Είδος υλικού">
            {(["worksheet", "quiz", "plan", "summary"] as const).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
          {(material.kind === "worksheet" || material.kind === "quiz") && <div className="grid gap-1.5">
            <Segmented<Material["level"]>
              value={material.level}
              onChange={(level) => patch(material.id, { level })}
              options={(["basic", "standard", "advanced"] as const).map((v) => ({ value: v, label: LEVEL_LABEL[v] }))}
            />
            <p className="text-xs text-muted">Στο χαρτί γράφει «Επίπεδο Α, Β ή Γ», για να μη χαρακτηρίζεται κανένα παιδί.</p>
          </div>}
          <label className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
            Ασπρόμαυρη εκτύπωση
            <Toggle label="Ασπρόμαυρη εκτύπωση" checked={material.blackAndWhite} onChange={(v) => patch(material.id, { blackAndWhite: v })} />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
            <span>
              Φιλικό για δυσλεξία
              <span className="block text-xs text-muted">Μεγαλύτερα γράμματα, πιο αραιό κείμενο</span>
            </span>
            <Toggle label="Φιλικό για δυσλεξία" checked={dyslexia} onChange={(v) => setDyslexia(material.id, v)} />
          </label>
        </>
      )}
      <Button
        variant="ghost"
        className="justify-self-start !text-danger"
        onClick={() => {
          const undo = remove(material.id);
          toast("Το υλικό διαγράφηκε", undo && { label: "Αναίρεση", run: undo });
          router.replace("/materials");
        }}
      >
        <Trash2 className="size-4" /> Διαγραφή υλικού
      </Button>
    </Card>
  );
}

function LessonLinks({ material }: { material: Material }) {
  const slots = useApp((s) => s.slots);
  const subjects = useSubjects();
  const classes = useApp((s) => s.classes);
  const attach = useApp((s) => s.attachMaterial);
  const detach = useApp((s) => s.detachMaterial);
  const today = useApp((s) => s.today);
  const linked = sortSlots(slots.filter((s) => s.materialIds.includes(material.id)));
  const upcoming = useMemo(
    () =>
      sortSlots(slots.filter((s) => s.date >= today && !s.materialIds.includes(material.id) && !s.carriedToId))
        .sort((a, b) => Number(b.subjectId === material.subjectId && b.classId === material.classId) - Number(a.subjectId === material.subjectId && a.classId === material.classId))
        .slice(0, 20),
    [slots, material, today],
  );
  const [target, setTarget] = useState("");
  const chosen = target || upcoming[0]?.id || "";
  const label = (id: string) => {
    const s = slots.find((x) => x.id === id)!;
    return `${dayName(s.date)} ${shortDate(s.date)} · ${s.start} · ${subjects.find((x) => x.id === s.subjectId)?.name} · ${classes.find((c) => c.id === s.classId)?.name}`;
  };

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <CalendarPlus className="size-5" /> Προσθήκη στο μάθημα
      </h2>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Δεν υπάρχουν προσεχή μαθήματα.{" "}
          <Link href="/settings/timetable" className="font-semibold text-brand hover:underline">
            Συμπλήρωσε το ωρολόγιο
          </Link>{" "}
          για να συνδέεις υλικό με μαθήματα.
        </p>
      ) : (
      <div className="mt-3 flex gap-2">
        <Select value={chosen} onChange={(e) => setTarget(e.target.value)} className="min-w-0 flex-1" aria-label="Μάθημα">
          {upcoming.map((s) => (
            <option key={s.id} value={s.id}>
              {label(s.id)}
            </option>
          ))}
        </Select>
        <IconButton
          label="Προσθήκη"
          className="size-10 shrink-0 bg-brand text-white hover:bg-brand-hover"
          disabled={!chosen}
          onClick={() => {
            attach(chosen, material.id);
            setTarget("");
            toast(`Προστέθηκε: ${label(chosen)}`);
          }}
        >
          <ArrowRight className="size-5" />
        </IconButton>
      </div>
      )}
      {linked.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {linked.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg bg-line-2 py-1.5 pl-3 pr-1 text-sm">
              <Check className="size-4 shrink-0 text-brand-500" />
              <Link href={`/lessons/${s.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {label(s.id)}
              </Link>
              <IconButton label="Αποσύνδεση" className="size-9" onClick={() => detach(s.id, material.id)}>
                <Link2Off className="size-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function HistoryCard({ material }: { material: Material }) {
  const restore = useApp((s) => s.restoreVersion);
  const restoreOriginal = useApp((s) => s.restoreOriginal);
  const [all, setAll] = useState(false);
  const shown = all ? material.versions : material.versions.slice(0, 5);
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <History className="size-5" /> Ιστορικό αλλαγών
        <span className="ml-auto text-xs font-medium text-muted">{material.versions.length}</span>
      </h2>
      <ol className="mt-3 space-y-1">
        {shown.map((v, i) => (
          <li key={v.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-line-2">
            <span className={clsx("size-2 shrink-0 rounded-full", i === 0 ? "bg-brand-500" : "bg-line")} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{v.label}</span>
              <span className="text-xs text-muted">{i === 0 ? "Τρέχουσα · " : ""}{relativeTime(v.at)}</span>
            </span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => {
                  restore(material.id, v.id);
                  toast(`Επαναφέρθηκε: ${v.label}`);
                }}
                className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-50 hover-capable:opacity-0 hover-capable:group-hover:opacity-100 focus:opacity-100"
              >
                Επαναφορά
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center justify-between">
        {material.versions.length > 5 ? (
          <button type="button" onClick={() => setAll((a) => !a)} className="text-xs font-semibold text-muted hover:text-ink">
            {all ? "Λιγότερα" : `Όλες οι ${material.versions.length} εκδόσεις`}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            restoreOriginal(material.id);
            toast("Επαναφορά στο πρωτότυπο");
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
        >
          <RotateCcw className="size-3.5" /> Στο πρωτότυπο
        </button>
      </div>
    </Card>
  );
}

/** «Εξαγωγή PDF»: the pupil's sheet or the answer sheet, through the print dialog. */
function ExportMenu({ onPrint, className }: { onPrint: (solutions: boolean) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("relative", className)}>
      <Button onClick={() => setOpen((o) => !o)} className="w-full" aria-expanded={open}>
        <Download className="size-4" /> Εξαγωγή PDF <ChevronDown className="size-4 opacity-80" />
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-60 animate-fade-in rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
          {[
            { sol: false, label: "Φύλλο μαθητή" },
            { sol: true, label: "Φύλλο λύσεων" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-line-2"
              onClick={() => {
                setOpen(false);
                onPrint(o.sol);
              }}
            >
              <FileText className="size-4 text-brand" /> {o.label}
            </button>
          ))}
          <p className="px-3 pb-1 pt-1 text-[11px] text-muted">Επίλεξε «Αποθήκευση ως PDF» στο παράθυρο εκτύπωσης.</p>
        </div>
      )}
    </div>
  );
}

/** New exercise, heading or text at the end of the sheet. */
function AddMenu({ onAdd }: { onAdd: (b: Block, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const items: { label: string; make: () => Block }[] = [
    { label: "Άσκηση", make: () => ({ id: uid(), type: "exercise", text: "Νέα άσκηση", lines: 2, level: "standard" }) },
    { label: "Επικεφαλίδα", make: () => ({ id: uid(), type: "heading", text: "Νέα επικεφαλίδα" }) },
    { label: "Κείμενο", make: () => ({ id: uid(), type: "text", text: "Νέο κείμενο" }) },
  ];
  return (
    <div className="relative">
      <IconButton label="Νέα άσκηση, επικεφαλίδα ή κείμενο" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus className="size-4" />
      </IconButton>
      {open && (
        <div className="absolute left-0 top-11 z-30 w-48 animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-pop">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-line-2"
              onClick={() => {
                setOpen(false);
                onAdd(it.make(), `Προσθήκη: ${it.label.toLowerCase()}`);
              }}
            >
              <Plus className="size-4 text-muted" /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const material = useApp((s) => s.materials.find((m) => m.id === id));
  const slots = useApp((s) => s.slots);
  const today = useApp((s) => s.today);
  const subjects = useSubjects();
  const classes = useApp((s) => s.classes);
  const changeBlocks = useApp((s) => s.changeBlocks);
  const patch = useApp((s) => s.patchMaterial);
  const duplicate = useApp((s) => s.duplicateMaterial);

  const [showSolutions, setShowSolutions] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [suggestion, setSuggestion] = useState<Suggestion>();
  const [preview, setPreview] = useState(false);
  const [printSolutions, setPrintSolutions] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showCreated, setShowCreated] = useState(params.get("created") === "1");
  const undoStack = useRef<Block[][]>([]);
  const redoStack = useRef<Block[][]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const h = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(h);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  if (!material) return <EmptyState icon={<FileQuestion className="size-6" />} title="Το υλικό δεν βρέθηκε" action={<ButtonLink href="/materials">Υλικό & αρχεία</ButtonLink>} />;

  const subject = subjects.find((s) => s.id === material.subjectId);
  const cls = classes.find((c) => c.id === material.classId);
  const createdSlot = slots.find((s) => s.id === params.get("slot"));
  // An uploaded file with no sheet made from it yet: the file is the document.
  const fileOnly = material.blocks.length === 0;
  const print = (solutions: boolean) => {
    setPrintSolutions(solutions);
    setPrinting(true);
  };

  const commit = (blocks: Block[], label: string) => {
    undoStack.current.push(material.blocks);
    redoStack.current = [];
    changeBlocks(material.id, blocks, label);
    force((n) => n + 1);
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(material.blocks);
    changeBlocks(material.id, prev, "Αναίρεση");
    force((n) => n + 1);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(material.blocks);
    changeBlocks(material.id, next, "Επανάληψη");
    force((n) => n + 1);
  };

  const blockLabel = (bid: string) => {
    const n = exerciseNumber(material.blocks, bid);
    return n ? `άσκηση ${n}` : "κείμενο";
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const changed = suggestion.changedIds.length > 0;
    if (changed) commit(suggestion.blocks, `AI: ${suggestion.summary.replace(/^Προτείνω /, "").replace(/\.$/, "")}`);
    if (suggestion.withSolutions && !material.withSolutions) patch(material.id, { withSolutions: true });
    if (suggestion.blackAndWhite) patch(material.id, { blackAndWhite: true });
    if (suggestion.versionB) {
      const bId = duplicate(material.id, suggestion.versionB, "(Δεύτερη εκδοχή)");
      toast("Δημιουργήθηκε δεύτερη εκδοχή του φύλλου", { label: "Άνοιγμα", run: () => router.push(`/materials/${bId}`) });
    } else {
      toast(changed ? "Η αλλαγή εφαρμόστηκε" : "Εφαρμόστηκε", changed ? { label: "Αναίρεση", run: undo } : undefined);
    }
    if (suggestion.withSolutions) setShowSolutions(true);
    setSuggestion(undefined);
  };

  const prepareFromFile = () => {
    const lesson = sortSlots(slots.filter((s) => s.materialIds.includes(material.id) && s.date >= today))[0];
    openPrepare({
      slotId: lesson?.id ?? null,
      source: material.file && { meta: material.file },
      defaults: { classId: material.classId, subjectId: material.subjectId },
    });
  };

  const changes = suggestion ? suggestion.changedIds.length : 0;
  const bar = suggestion ? (
    <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-1.5 pl-3 shadow-pop" role="status">
      <Sparkles className="size-4 shrink-0 text-amber" />
      <p className="min-w-0 flex-1 text-[13px] font-semibold leading-tight">
        {changes ? `${changes} ${changes === 1 ? "αλλαγή" : "αλλαγές"}` : "Η πρόταση είναι έτοιμη"}
        {changes > 0 && <span className="block text-xs font-normal text-ink-2">με κίτρινο στο φύλλο</span>}
      </p>
      <Button size="sm" onClick={applySuggestion}>
        <Check className="size-4" /> Εφαρμογή
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setSuggestion(undefined)}>
        Ακύρωση
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface/95 p-1.5 shadow-card backdrop-blur">
      <Button size="sm" className="lg:hidden" onClick={() => setChangeOpen(true)}>
        <Sparkles className="size-4" /> Άλλαξέ το
      </Button>
      <IconButton label="Αναίρεση" onClick={undo} disabled={!undoStack.current.length}>
        <Undo2 className="size-4" />
      </IconButton>
      <IconButton label="Επανάληψη" onClick={redo} disabled={!redoStack.current.length} className="max-sm:hidden">
        <Redo2 className="size-4" />
      </IconButton>
      <AddMenu onAdd={(b, label) => commit([...material.blocks, b], label)} />
      <span className="ml-auto hidden px-2 text-xs text-muted xl:block">{selectedId ? `Επιλογή: ${blockLabel(selectedId)}` : "Πάτησε ένα κομμάτι για να το αλλάξεις"}</span>
      <button
        type="button"
        aria-pressed={showSolutions}
        onClick={() => setShowSolutions((v) => !v)}
        className={clsx(
          "ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors xl:ml-0",
          showSolutions ? "bg-brand-50 text-brand shadow-[inset_0_0_0_1px_var(--color-brand-100)]" : "text-ink-2 hover:bg-line-2",
        )}
      >
        <Eye className="size-4" /> Λύσεις
      </button>
      {material.file && (
        <Button variant="ghost" size="sm" onClick={() => setOriginalOpen(true)} aria-label="Πρωτότυπο αρχείο" title="Πρωτότυπο αρχείο">
          <Paperclip className="size-4" /> <span className="max-sm:hidden">Πρωτότυπο</span>
        </Button>
      )}
    </div>
  );

  const doc = fileOnly ? (
    <div className="grid gap-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Φτιάξε φύλλο από αυτό το αρχείο</p>
          <p className="text-sm text-muted">Φύλλο εργασίας, τεστ, 3 επίπεδα ή σχέδιο μαθήματος, με βάση τη σελίδα σου.</p>
        </div>
        <div className="flex gap-2">
          <PrintButton material={material} />
          <Button onClick={prepareFromFile}>
            <Sparkles className="size-4" /> Ετοίμασε
          </Button>
        </div>
      </Card>
      <div className="rounded-2xl bg-line-2/70 p-2 sm:p-6">
        <OriginalView material={material} />
      </div>
    </div>
  ) : (
    <div>
      <div className="no-print sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 mb-3 lg:top-[4.75rem]">{bar}</div>
      <div className="rounded-2xl bg-line-2/70 p-2 sm:p-6">
        <DocPage
          material={material}
          blocks={suggestion ? suggestion.blocks : material.blocks}
          mode={showSolutions && !suggestion ? "solutions" : "edit"}
          highlight={suggestion ? suggestion.changedIds : []}
          edit={
            suggestion || showSolutions
              ? undefined
              : {
                  selectedId,
                  onSelect: setSelectedId,
                  // Hand-written wording replaces the generated variants, so later AI steps start from it.
                  onSave: (bid, p) => commit(material.blocks.map((b) => (b.id === bid ? { ...b, ...p, variants: undefined, variantB: undefined } : b)), `Επεξεργασία: ${blockLabel(bid)}`),
                  onMove: (bid, dir) => {
                    const i = material.blocks.findIndex((b) => b.id === bid);
                    const next = [...material.blocks];
                    [next[i], next[i + dir]] = [next[i + dir], next[i]];
                    commit(next, "Αλλαγή σειράς");
                  },
                  onDelete: (bid) => {
                    const label = blockLabel(bid);
                    commit(material.blocks.filter((b) => b.id !== bid), `Διαγραφή: ${label}`);
                    setSelectedId(undefined);
                    toast(`Διαγράφηκε: ${label}`, { label: "Αναίρεση", run: undo });
                  },
                }
          }
        />
      </div>
    </div>
  );

  const adapt = (
    <AdaptPanel
      material={material}
      selectedId={selectedId}
      onSelect={setSelectedId}
      suggestion={suggestion}
      onSuggest={(s) => {
        setSuggestion(s);
        setShowSolutions(false);
        setChangeOpen(false);
      }}
      onApply={applySuggestion}
      onDiscard={() => setSuggestion(undefined)}
    />
  );

  return (
    <div className="lg:-mx-2">
      <div className="no-print mb-4 flex flex-wrap items-start gap-3">
        <BackButton fallback="/materials" />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate text-[13px] text-muted">
            Υλικό · {subject?.name}
          </p>
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={material.title}
              aria-label="Τίτλος"
              onBlur={(e) => {
                if (e.target.value.trim()) patch(material.id, { title: e.target.value.trim().slice(0, 200) });
                setEditingTitle(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              maxLength={200}
              className="w-full rounded-lg border border-brand-500 bg-surface px-2 text-[24px] font-semibold tracking-[-0.025em] text-brand-700 outline-none sm:text-[34px]"
            />
          ) : (
            <h1
              role="button"
              tabIndex={0}
              onClick={() => setEditingTitle(true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditingTitle(true)}
              title="Πάτησε για μετονομασία"
              className="cursor-text break-words text-[24px] font-semibold tracking-[-0.02em] leading-tight tracking-tight text-brand-700 sm:text-[34px]">
              {material.title}
            </h1>
          )}
          <p className="text-[15px] text-muted sm:text-lg">
            {cls?.grade} · {KIND_LABEL[material.kind]}
          </p>
        </div>
        {!fileOnly && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="mr-1 hidden items-center gap-1.5 text-sm text-muted md:flex">
              <CheckCircle2 className="size-4 text-brand-500" /> Αποθηκεύτηκε
            </span>
            <Button variant="secondary" onClick={() => setPreview(true)} className="max-lg:hidden">
              <Eye className="size-4" /> Προεπισκόπηση
            </Button>
            <ExportMenu onPrint={print} className="flex-1 sm:flex-none" />
          </div>
        )}
      </div>

      {showCreated && (
        <div className="no-print mb-4 flex animate-slide-up items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <Sparkles className="size-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm">
            <span className="font-bold">Το υλικό είναι έτοιμο.</span>{" "}
            {createdSlot ? (
              <>
                Μπήκε στο μάθημα{" "}
                <Link href={`/lessons/${createdSlot.id}`} className="font-semibold text-brand underline">
                  {dayName(createdSlot.date)} {createdSlot.start}
                </Link>
                . Έλεγξέ το πριν το μοιράσεις.
              </>
            ) : (
              "Έλεγξέ το πριν το μοιράσεις και πρόσθεσέ το σε ένα μάθημα."
            )}
          </p>
          <IconButton label="Κλείσιμο" className="size-8" onClick={() => setShowCreated(false)}>
            <X className="size-4" />
          </IconButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="no-print min-w-0">{doc}</div>
        <div className="no-print space-y-4">
          {!fileOnly && <div className="max-lg:hidden">{adapt}</div>}
          <LessonLinks material={material} />
          <MaterialDetails material={material} />
          <HistoryCard material={material} />
        </div>
      </div>

      <Sheet open={changeOpen} onClose={() => setChangeOpen(false)} title="Άλλαξέ το">
        <div className="-mx-5 -my-4 [&>*]:rounded-none [&>*]:border-0 [&>*]:shadow-none">{adapt}</div>
      </Sheet>

      <Sheet open={originalOpen} onClose={() => setOriginalOpen(false)} title="Πρωτότυπο" wide>
        <OriginalView material={material} />
      </Sheet>

      <Sheet open={preview} onClose={() => setPreview(false)} title="Προεπισκόπηση" wide>
        <div className="rounded-xl bg-line-2 p-2 sm:p-4">
          <DocPage material={material} blocks={material.blocks} mode="view" />
        </div>
      </Sheet>

      <div className="print-doc hidden print:block">
        <DocPage material={material} blocks={material.blocks} mode={printSolutions ? "solutions" : "view"} className="!max-w-none !shadow-none" />
      </div>
    </div>
  );
}

export default function MaterialPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
