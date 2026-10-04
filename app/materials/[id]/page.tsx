"use client";

import clsx from "clsx";
import {
  ArrowRight, CalendarPlus, Check, CheckCircle2, ChevronDown, Download, Eye, FileQuestion, FileText, History, Link2Off, Plus, Redo2, RotateCcw, Sparkles, Type, Undo2, X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdaptPanel, type Suggestion } from "@/components/doc/AdaptPanel";
import { DocPage } from "@/components/doc/DocPage";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, EmptyState, IconButton, Segmented, Select, Sheet, Tabs } from "@/components/ui";
import { dayName, DEMO_TODAY, relativeTime, shortDate } from "@/lib/dates";
import { uid } from "@/lib/id";
import { exerciseNumber, fileKindLabel, KIND_LABEL } from "@/lib/materials";
import { sortSlots } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { loadBlob } from "@/lib/store/blobs";
import type { Block, Material } from "@/lib/types";

type Tab = "original" | "edit" | "solutions";
type Pane = "doc" | "ai" | "more";

function OriginalView({ material }: { material: Material }) {
  const [url, setUrl] = useState<string>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let revoke: string | undefined;
    if (!material.file?.blobKey) return setMissing(true);
    void loadBlob(material.file.blobKey).then((blob) => {
      if (!blob) return setMissing(true);
      revoke = URL.createObjectURL(blob);
      setUrl(revoke);
    });
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [material.file?.blobKey]);

  const file = material.file;
  if (!file || missing)
    return (
      <div>
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-line-2 px-3 py-2 text-sm text-muted">
          <FileQuestion className="size-4 shrink-0" />
          {file ? "Δείγμα επίδειξης — δεν υπάρχει πραγματικό αρχείο. Βλέπεις το αρχικό περιεχόμενο πριν από τις αλλαγές." : "Χωρίς αρχείο. Βλέπεις το αρχικό περιεχόμενο."}
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

function LessonLinks({ material }: { material: Material }) {
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const classes = useApp((s) => s.classes);
  const attach = useApp((s) => s.attachMaterial);
  const detach = useApp((s) => s.detachMaterial);
  const linked = sortSlots(slots.filter((s) => s.materialIds.includes(material.id)));
  const upcoming = useMemo(
    () =>
      sortSlots(slots.filter((s) => s.date >= DEMO_TODAY && !s.materialIds.includes(material.id) && !s.carriedToId))
        .sort((a, b) => Number(b.subjectId === material.subjectId && b.classId === material.classId) - Number(a.subjectId === material.subjectId && a.classId === material.classId))
        .slice(0, 20),
    [slots, material],
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
          className="size-10 shrink-0 bg-brand text-white hover:bg-brand-700"
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
      {linked.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {linked.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg bg-line-2 py-1.5 pl-3 pr-1 text-sm">
              <Check className="size-4 shrink-0 text-brand-500" />
              <Link href={`/lessons/${s.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {label(s.id)}
              </Link>
              <IconButton label="Αποσύνδεση" className="size-7" onClick={() => detach(s.id, material.id)}>
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
                className="rounded-md px-2 py-1 text-xs font-semibold text-brand opacity-100 hover:bg-brand-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
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

function Editor() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const material = useApp((s) => s.materials.find((m) => m.id === id));
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const classes = useApp((s) => s.classes);
  const changeBlocks = useApp((s) => s.changeBlocks);
  const patch = useApp((s) => s.patchMaterial);
  const duplicate = useApp((s) => s.duplicateMaterial);

  const [tab, setTab] = useState<Tab>("edit");
  const [pane, setPane] = useState<Pane>("doc");
  const [selectedId, setSelectedId] = useState<string>();
  const [suggestion, setSuggestion] = useState<Suggestion>();
  const [preview, setPreview] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
    if (suggestion.blackAndWhite) patch(material.id, { blackAndWhite: !material.blackAndWhite });
    if (suggestion.versionB) {
      const bId = duplicate(material.id, suggestion.versionB, "(Εκδοχή Β)");
      if (!material.title.endsWith("(Εκδοχή Α)")) patch(material.id, { title: `${material.title} (Εκδοχή Α)` });
      toast("Δημιουργήθηκε η Εκδοχή Β", { label: "Άνοιγμα", run: () => router.push(`/materials/${bId}`) });
    } else {
      toast(changed ? "Η αλλαγή εφαρμόστηκε" : "Εφαρμόστηκε", changed ? { label: "Αναίρεση", run: undo } : undefined);
    }
    if (suggestion.withSolutions) setTab("solutions");
    setSuggestion(undefined);
    setPane("doc");
  };

  const docBlocks = suggestion && tab === "edit" ? suggestion.blocks : material.blocks;

  const doc = (
    <div>
      {tab === "edit" && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1.5">
          <IconButton label="Αναίρεση" onClick={undo} disabled={!undoStack.current.length}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Επανάληψη" onClick={redo} disabled={!redoStack.current.length}>
            <Redo2 className="size-4" />
          </IconButton>
          <span className="mx-1 h-6 w-px bg-line" />
          <Button variant="ghost" size="sm" onClick={() => commit([...material.blocks, { id: uid("b"), type: "exercise", text: "Νέα άσκηση", lines: 2, level: "standard" }], "Προσθήκη άσκησης")}>
            <Plus className="size-4" /> Άσκηση
          </Button>
          <Button variant="ghost" size="sm" onClick={() => commit([...material.blocks, { id: uid("b"), type: "text", text: "Νέο κείμενο" }], "Προσθήκη κειμένου")}>
            <Type className="size-4" /> Κείμενο
          </Button>
          <span className="ml-auto hidden px-2 text-xs text-muted sm:block">{selectedId ? `Επιλογή: ${blockLabel(selectedId)}` : "Πάτησε ένα μπλοκ για επεξεργασία"}</span>
        </div>
      )}
      <div className="rounded-2xl bg-line-2/70 p-2 sm:p-6">
        {tab === "original" ? (
          <OriginalView material={material} />
        ) : (
          <DocPage
            material={material}
            blocks={docBlocks}
            mode={tab === "solutions" ? "solutions" : "edit"}
            highlight={suggestion && tab === "edit" ? suggestion.changedIds : []}
            edit={
              suggestion
                ? undefined
                : {
                    selectedId,
                    onSelect: setSelectedId,
                    onSave: (bid, p) => commit(material.blocks.map((b) => (b.id === bid ? { ...b, ...p } : b)), `Επεξεργασία: ${blockLabel(bid)}`),
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
        )}
      </div>
      {suggestion && tab === "edit" && (
        <p className="no-print mt-2 text-center text-xs font-medium text-amber">Προεπισκόπηση πρότασης — οι αλλαγές φαίνονται με κίτρινο</p>
      )}
    </div>
  );

  const side = (
    <div className="space-y-4">
      <div className={clsx(pane !== "ai" && "max-lg:hidden")}>
        <AdaptPanel
          material={material}
          selectedId={selectedId}
          onSelect={setSelectedId}
          suggestion={suggestion}
          onSuggest={(s) => {
            setSuggestion(s);
            setTab("edit");
          }}
          onApply={applySuggestion}
          onDiscard={() => setSuggestion(undefined)}
        />
      </div>
      <div className={clsx("space-y-4", pane !== "more" && "max-lg:hidden")}>
        <LessonLinks material={material} />
        <HistoryCard material={material} />
      </div>
    </div>
  );

  return (
    <div className="lg:-mx-2">
      <nav className="no-print mb-2 flex items-center gap-1.5 text-sm text-muted" aria-label="Διαδρομή">
        <Link href="/materials" className="hover:text-ink">
          Υλικό & αρχεία
        </Link>
        <span>/</span>
        <span className="hidden sm:inline">{subject?.name}</span>
        <span className="hidden sm:inline">/</span>
        <span className="truncate text-ink-2">{material.title}</span>
      </nav>

      <div className="no-print mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={material.title}
              aria-label="Τίτλος"
              onBlur={(e) => {
                if (e.target.value.trim()) patch(material.id, { title: e.target.value.trim() });
                setEditingTitle(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded-lg border border-brand-500 bg-surface px-2 text-[28px] font-extrabold tracking-tight text-brand-700 outline-none sm:text-[36px]"
            />
          ) : (
            <h1 onClick={() => setEditingTitle(true)} title="Πάτησε για μετονομασία" className="cursor-text text-[28px] font-extrabold leading-tight tracking-tight text-brand-700 sm:text-[36px]">
              {material.title}
            </h1>
          )}
          <p className="text-[15px] text-muted sm:text-lg">
            {cls?.grade} · {KIND_LABEL[material.kind]}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="mr-1 hidden items-center gap-1.5 text-sm text-muted md:flex">
            <CheckCircle2 className="size-4 text-brand-500" /> Αποθηκεύτηκε
          </span>
          <Button variant="secondary" onClick={() => setPreview(true)} className="flex-1 sm:flex-none">
            <Eye className="size-4" /> Προεπισκόπηση
          </Button>
          <div className="relative flex-1 sm:flex-none">
            <Button onClick={() => setExportOpen((o) => !o)} className="w-full" aria-expanded={exportOpen}>
              <Download className="size-4" /> Εξαγωγή PDF <ChevronDown className="size-4 opacity-80" />
            </Button>
            {exportOpen && (
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
                      setPrintSolutions(o.sol);
                      setExportOpen(false);
                      setPrinting(true);
                    }}
                  >
                    <FileText className="size-4 text-brand" /> {o.label}
                  </button>
                ))}
                <p className="px-3 pb-1 pt-1 text-[11px] text-muted">Επίλεξε «Αποθήκευση ως PDF» στο παράθυρο εκτύπωσης.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreated && (
        <div className="no-print mb-4 flex animate-slide-up items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <Sparkles className="size-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm">
            <span className="font-bold">Το υλικό είναι έτοιμο.</span>{" "}
            {createdSlot ? (
              <>
                Συνδέθηκε με το μάθημα{" "}
                <Link href={`/lessons/${createdSlot.id}`} className="font-semibold text-brand underline">
                  {dayName(createdSlot.date)} {createdSlot.start}
                </Link>
                .
              </>
            ) : (
              "Προσάρμοσέ το ή πρόσθεσέ το σε ένα μάθημα."
            )}
          </p>
          <IconButton label="Κλείσιμο" className="size-8" onClick={() => setShowCreated(false)}>
            <X className="size-4" />
          </IconButton>
        </div>
      )}

      <Segmented<Pane>
        value={pane}
        onChange={setPane}
        className="no-print mb-4 lg:hidden"
        options={[
          { value: "doc", label: "Έγγραφο" },
          { value: "ai", label: suggestion ? "Πρόταση •" : "Προσαρμογή" },
          { value: "more", label: "Μάθημα & ιστορικό" },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={clsx("no-print min-w-0", pane !== "doc" && "max-lg:hidden")}>
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            className="mb-4"
            tabs={[
              { value: "original", label: "Πρωτότυπο" },
              { value: "edit", label: "Επεξεργασία" },
              { value: "solutions", label: "Λύσεις" },
            ]}
          />
          {doc}
        </div>
        <div className="no-print">{side}</div>
      </div>

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
