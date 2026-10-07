"use client";

import clsx from "clsx";
import {
  ArrowRight, CalendarPlus, Check, Download, CheckCircle2, Eye, FileQuestion, FileText, History, Link2Off, Paperclip, Pencil, Plus, Printer, RotateCcw, Settings2, Sparkles, Trash2,
} from "@/components/icons";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdaptPanel, type Suggestion } from "@/components/doc/AdaptPanel";
import { DocPage } from "@/components/doc/DocPage";
import { PrintButton } from "@/components/booklets";
import { Menu } from "@/components/menu";
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

/** Class, subject, kind and level: where the sheet is filed and who it is for. */
function MaterialDetails({ material }: { material: Material }) {
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const patch = useApp((s) => s.patchMaterial);
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
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
        </>
      )}
    </div>
  );
}

/** «Εκτύπωση»: which sheet, black and white or dyslexia-friendly, then the printer (or a PDF). */
function PrintSheet({ material, open, onClose, onPrint }: { material: Material; open: boolean; onClose: () => void; onPrint: (solutions: boolean) => void }) {
  const patch = useApp((s) => s.patchMaterial);
  const dyslexia = useDyslexia((s) => s.ids.includes(material.id));
  const setDyslexia = useDyslexia((s) => s.set);
  const [solutions, setSolutions] = useState(false);
  const hasAnswers = material.blocks.some((b) => b.type === "exercise");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Εκτύπωση"
      footer={
        <div className="pb-3">
          <Button size="lg" className="w-full" onClick={() => onPrint(solutions)}>
            <Printer className="size-5" /> Εκτύπωση
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {hasAnswers && (
          <Segmented<"pupil" | "answers">
            value={solutions ? "answers" : "pupil"}
            onChange={(v) => setSolutions(v === "answers")}
            options={[
              { value: "pupil", label: "Φύλλο μαθητή" },
              { value: "answers", label: "Φύλλο λύσεων" },
            ]}
          />
        )}
        <div className="grid grid-cols-1 divide-y divide-line rounded-xl border border-line bg-surface px-4">
          <label className="flex min-h-14 items-center justify-between gap-3 text-[15px]">
            Ασπρόμαυρη εκτύπωση
            <Toggle label="Ασπρόμαυρη εκτύπωση" checked={material.blackAndWhite} onChange={(v) => patch(material.id, { blackAndWhite: v })} />
          </label>
          <label className="flex min-h-14 items-center justify-between gap-3 text-[15px]">
            <span>
              Φιλικό για δυσλεξία
              <span className="block text-xs text-muted">Μεγαλύτερα γράμματα, πιο αραιό κείμενο</span>
            </span>
            <Toggle label="Φιλικό για δυσλεξία" checked={dyslexia} onChange={(v) => setDyslexia(material.id, v)} />
          </label>
        </div>
        <p className="text-[13px] text-muted">Στο παράθυρο που ανοίγει ορίζεις πόσα αντίγραφα. Για αρχείο PDF διάλεξε «Αποθήκευση ως PDF».</p>
      </div>
    </Sheet>
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
    <div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">
          Δεν υπάρχουν προσεχή μαθήματα.{" "}
          <Link href="/settings/timetable" className="font-semibold text-brand hover:underline">
            Συμπλήρωσε το ωρολόγιο
          </Link>{" "}
          για να συνδέεις υλικό με μαθήματα.
        </p>
      ) : (
      <div className="flex gap-2">
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
    </div>
  );
}

function HistoryCard({ material }: { material: Material }) {
  const restore = useApp((s) => s.restoreVersion);
  const restoreOriginal = useApp((s) => s.restoreOriginal);
  const [all, setAll] = useState(false);
  const shown = all ? material.versions : material.versions.slice(0, 5);
  return (
    <div aria-label="Ιστορικό αλλαγών" role="region">
      <ol className="space-y-1">
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
  const remove = useApp((s) => s.deleteMaterial);

  const [editing, setEditing] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [panel, setPanel] = useState<null | "change" | "print" | "details" | "lesson" | "history" | "original">(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [suggestion, setSuggestion] = useState<Suggestion>();
  const [printSolutions, setPrintSolutions] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const undoStack = useRef<Block[][]>([]);
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

  // Straight from «Ετοίμασε»: one quiet line, no banner to close.
  const created = params.get("created") === "1";
  const createdSlot = slots.find((s) => s.id === params.get("slot"));
  useEffect(() => {
    if (created) toast(createdSlot ? `Το υλικό είναι έτοιμο. Μπήκε στο μάθημα ${dayName(createdSlot.date)} ${createdSlot.start}.` : "Το υλικό είναι έτοιμο.");
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!material) return <EmptyState icon={<FileQuestion className="size-6" />} title="Το υλικό δεν βρέθηκε" action={<ButtonLink href="/materials">Υλικό & αρχεία</ButtonLink>} />;

  const subject = subjects.find((s) => s.id === material.subjectId);
  const cls = classes.find((c) => c.id === material.classId);
  const linked = sortSlots(slots.filter((s) => s.materialIds.includes(material.id)));
  // An uploaded file with no sheet made from it yet: the file is the document.
  const fileOnly = material.blocks.length === 0;
  const print = (solutions: boolean) => {
    setPanel(null);
    setPrintSolutions(solutions);
    setPrinting(true);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    changeBlocks(material.id, prev, "Αναίρεση");
    force((n) => n + 1);
  };
  /** Every change is saved at once; the toast offers to take it back. */
  const commit = (blocks: Block[], label: string, message = "Αποθηκεύτηκε") => {
    undoStack.current.push(material.blocks);
    changeBlocks(material.id, blocks, label);
    force((n) => n + 1);
    toast(message, { label: "Αναίρεση", run: undo });
  };

  const blockLabel = (bid: string) => {
    const n = exerciseNumber(material.blocks, bid);
    return n ? `άσκηση ${n}` : "κείμενο";
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const changed = suggestion.changedIds.length > 0;
    if (changed) commit(suggestion.blocks, `AI: ${suggestion.summary.replace(/^Προτείνω /, "").replace(/\.$/, "")}`, "Η αλλαγή εφαρμόστηκε");
    if (suggestion.withSolutions && !material.withSolutions) patch(material.id, { withSolutions: true });
    if (suggestion.blackAndWhite) patch(material.id, { blackAndWhite: true });
    if (suggestion.versionB) {
      const bId = duplicate(material.id, suggestion.versionB, "(Δεύτερη εκδοχή)");
      toast("Δημιουργήθηκε δεύτερη εκδοχή του φύλλου", { label: "Άνοιγμα", run: () => router.push(`/materials/${bId}`) });
    } else if (!changed) toast("Εφαρμόστηκε");
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

  const save = () =>
    toast(`Αποθηκεύτηκε στο Υλικό · ${cls?.name ?? ""} · ${subject?.name ?? ""}`, { label: "Στο Υλικό", run: () => router.push("/materials") });

  const addExercise = () => {
    const b: Block = { id: uid(), type: "exercise", text: "Νέα άσκηση", lines: 2, level: "standard" };
    commit([...material.blocks, b], "Προσθήκη: άσκηση", "Προστέθηκε άσκηση");
    setSelectedId(b.id);
  };

  const menu = (
    <Menu
      label="Περισσότερα"
      items={[
        { label: "Τάξη, μάθημα, επίπεδο", icon: <Settings2 />, onClick: () => setPanel("details") },
        ...(fileOnly
          ? []
          : [
              { label: showSolutions ? "Κρύψε τις λύσεις" : "Δείξε τις λύσεις", icon: <Eye />, onClick: () => (setShowSolutions((v) => !v), setEditing(false)) },
              { label: "Πρόσθεσε άσκηση", icon: <Plus />, onClick: () => (setEditing(true), addExercise()) },
            ]),
        { label: linked.length ? "Στα μαθήματα…" : "Βάλε σε μάθημα", icon: <CalendarPlus />, onClick: () => setPanel("lesson") },
        ...(fileOnly ? [] : [{ label: "Ιστορικό αλλαγών", icon: <History />, onClick: () => setPanel("history") }]),
        ...(material.file && !fileOnly ? [{ label: "Πρωτότυπο αρχείο", icon: <Paperclip />, onClick: () => setPanel("original") }] : []),
        {
          label: "Διαγραφή",
          icon: <Trash2 />,
          onClick: () => {
            const back = remove(material.id);
            toast("Το υλικό διαγράφηκε", back && { label: "Αναίρεση", run: back });
            router.replace("/materials");
          },
        },
      ]}
    />
  );

  const header = (
    <div className="no-print mb-4 flex items-start gap-2">
      <BackButton fallback="/materials" />
      <div className="min-w-0 flex-1">
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
            className="w-full rounded-lg border border-brand-500 bg-surface px-2 text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none sm:text-[28px]"
          />
        ) : (
          <h1
            role="button"
            tabIndex={0}
            onClick={() => setEditingTitle(true)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditingTitle(true)}
            title="Πάτησε για μετονομασία"
            className="cursor-text break-words text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]"
          >
            {material.title}
          </h1>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
          <button type="button" onClick={() => setPanel("details")} className="rounded-md font-semibold text-ink-2 underline decoration-line underline-offset-4 hover:text-brand">
            {[cls?.name, subject?.name, KIND_LABEL[material.kind]].filter(Boolean).join(" · ")}
          </button>
          <span className="inline-flex items-center gap-1 text-brand-500">
            <CheckCircle2 className="size-4" /> Αποθηκεύτηκε
          </span>
          {linked[0] && (
            <Link href={`/lessons/${linked[0].id}`} className="hover:text-brand hover:underline">
              · στο μάθημα {dayName(linked[0].date)} {linked[0].start}
            </Link>
          )}
        </p>
      </div>
      {menu}
    </div>
  );

  const sheets = (
    <>
      <Sheet open={panel === "details"} onClose={() => setPanel(null)} title="Τάξη, μάθημα, επίπεδο">
        <MaterialDetails material={material} />
      </Sheet>
      <Sheet open={panel === "lesson"} onClose={() => setPanel(null)} title="Βάλε σε μάθημα">
        <LessonLinks material={material} />
      </Sheet>
      <Sheet open={panel === "history"} onClose={() => setPanel(null)} title="Ιστορικό αλλαγών">
        <HistoryCard material={material} />
      </Sheet>
      <Sheet open={panel === "original"} onClose={() => setPanel(null)} title="Πρωτότυπο" wide>
        <OriginalView material={material} />
      </Sheet>
    </>
  );

  if (fileOnly)
    return (
      <div className="mx-auto max-w-3xl">
        {header}
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
        {sheets}
      </div>
    );

  const changes = suggestion ? suggestion.changedIds.length : 0;
  const topBar = suggestion ? (
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
  ) : editing ? (
    <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 p-1.5 pl-3 shadow-pop" role="status">
      <Pencil className="size-4 shrink-0 text-brand" />
      <p className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-ink">Πάτησε μια άσκηση ή ένα κείμενο για να το διορθώσεις</p>
      <Button size="sm" variant="secondary" onClick={addExercise}>
        <Plus className="size-4" /> Άσκηση
      </Button>
      <Button size="sm" onClick={() => (setEditing(false), setSelectedId(undefined))}>
        Τέλος
      </Button>
    </div>
  ) : showSolutions ? (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pl-3 shadow-card" role="status">
      <Eye className="size-4 shrink-0 text-muted" />
      <p className="min-w-0 flex-1 text-[13px] font-semibold">Βλέπεις τις λύσεις</p>
      <Button size="sm" variant="secondary" onClick={() => setShowSolutions(false)}>
        Κρύψε τις λύσεις
      </Button>
    </div>
  ) : null;

  const action = (label: string, Icon: typeof Printer, onClick: () => void, primary?: boolean, pressed?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={clsx(
        "flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[12.5px] font-semibold transition-[background-color,transform] active:scale-[0.97] sm:h-12 sm:flex-row sm:gap-2 sm:text-sm",
        primary ? "bg-brand text-white shadow-[0_6px_14px_-8px_rgb(30_58_138/0.55)] hover:bg-brand-hover" : pressed ? "bg-brand-50 text-brand" : "text-ink-2 hover:bg-line-2",
      )}
    >
      <Icon className="size-5" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {header}

      {topBar && <div className="no-print sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 mb-3 lg:top-[4.75rem]">{topBar}</div>}

      <div className="no-print rounded-2xl bg-line-2/70 p-2 sm:p-6">
        <DocPage
          material={material}
          blocks={suggestion ? suggestion.blocks : material.blocks}
          mode={showSolutions && !suggestion ? "solutions" : editing && !suggestion ? "edit" : "view"}
          highlight={suggestion ? suggestion.changedIds : []}
          edit={
            !editing || suggestion || showSolutions
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
                    commit(material.blocks.filter((b) => b.id !== bid), `Διαγραφή: ${label}`, `Διαγράφηκε: ${label}`);
                    setSelectedId(undefined);
                  },
                }
          }
        />
      </div>

      {/* Four things, always in the same place: save, edit, change with AI, print. */}
      <div className="no-print sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 mt-4 lg:bottom-4">
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur" role="toolbar" aria-label="Ενέργειες φύλλου">
          {action("Αποθήκευση", Check, save)}
          {action(editing ? "Τέλος" : "Επεξεργασία", Pencil, () => (setEditing((v) => !v), setShowSolutions(false), setSelectedId(undefined)), false, editing)}
          {action("Άλλαξέ το", Sparkles, () => (setEditing(false), setPanel("change")))}
          {action("Εκτύπωση", Printer, () => setPanel("print"), true)}
        </div>
      </div>

      <Sheet open={panel === "change"} onClose={() => setPanel(null)} title="Άλλαξέ το">
        <div className="-mx-5 -my-4 [&>*]:rounded-none [&>*]:border-0 [&>*]:shadow-none">
          <AdaptPanel
            material={material}
            selectedId={selectedId}
            onSelect={setSelectedId}
            suggestion={suggestion}
            onSuggest={(sg) => {
              setSuggestion(sg);
              setShowSolutions(false);
              setPanel(null);
            }}
            onApply={applySuggestion}
            onDiscard={() => setSuggestion(undefined)}
          />
        </div>
      </Sheet>
      <PrintSheet material={material} open={panel === "print"} onClose={() => setPanel(null)} onPrint={print} />
      {sheets}

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
