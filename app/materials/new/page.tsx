"use client";

import clsx from "clsx";
import { Check, CheckCircle2, CloudUpload, FileText, ListChecks, Loader2, NotebookText, RefreshCw, Sparkles, SquareCheckBig } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type DragEvent } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { FileBadge } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, Card, cx, Field, inputClass, Segmented, Select, Toggle } from "@/components/ui";
import { ACCEPT, ingestFile } from "@/components/upload";
import { aiCreate } from "@/lib/ai/client";
import { shortDate } from "@/lib/dates";
import { fileKindLabel, formatBytes, KIND_LABEL, LEVEL_LABEL, titleFromFileName } from "@/lib/materials";
import { SUBJECTS } from "@/lib/seed";
import { useApp } from "@/lib/store";
import { usePendingUpload } from "@/lib/store/pending";
import type { Block, Level, MaterialKind, SubjectId } from "@/lib/types";

const KINDS: { value: Exclude<MaterialKind, "file">; Icon: typeof FileText }[] = [
  { value: "worksheet", Icon: FileText },
  { value: "plan", Icon: ListChecks },
  { value: "quiz", Icon: SquareCheckBig },
  { value: "summary", Icon: NotebookText },
];

const SAMPLE = { name: "mathimatika_d.pdf", size: 1_240_000, type: "application/pdf" };

function guessSubject(name: string): SubjectId | undefined {
  const n = name.toLowerCase();
  if (/math|μαθημ|arithm|grafik|γραφ/.test(n)) return "math";
  if (/gloss|γλωσσ|orthogr|ορθογρ/.test(n)) return "glossa";
  if (/melet|μελετ|nero|νερ|perivall/.test(n)) return "meleti";
  if (/eikast|εικαστ|afisa|αφισ/.test(n)) return "eikastika";
}

function SampleSheet() {
  return (
    <div className="paper mx-auto w-40 rotate-[-1deg] rounded-sm bg-white p-3 text-[7px] leading-tight text-ink shadow-paper">
      <p className="font-bold">Μαθηματικά</p>
      <p className="text-muted">Δ΄ Δημοτικού</p>
      <p className="mt-2">1. Υπολόγισε:</p>
      <p>α) 246 + 178 = ____</p>
      <p>β) 503 − 267 = ____</p>
      <p className="mt-1.5">2. Συμπλήρωσε:</p>
      <p>α) 6 × 8 = ____</p>
      <p>β) 72 : 9 = ____</p>
      <p className="mt-1.5">3. Λύσε το πρόβλημα:</p>
      <p>Ένα βιβλιοπωλείο είχε 125 βιβλία…</p>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = ["Αρχείο", "Προσαρμογή", "Έτοιμο"];
  return (
    <ol className="flex items-center gap-2 text-sm">
      {items.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={clsx(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                active && "border-brand bg-brand text-white",
                done && "border-brand-500 bg-brand-50 text-brand",
                !active && !done && "border-line text-muted",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={clsx("whitespace-nowrap", active ? "font-bold text-ink" : "text-muted")}>{label}</span>
            {n < 3 && <span className="h-px flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const slotId = params.get("slot");
  const slot = useApp((s) => s.slots.find((x) => x.id === slotId));
  const classes = useApp((s) => s.classes);
  const subjects = useApp((s) => s.subjects);
  const create = useApp((s) => s.createMaterial);
  const mode = useApp((s) => s.mode);
  const cloud = mode === "cloud";
  const attach = useApp((s) => s.attachMaterial);
  const { file, previewUrl, set: setPending } = usePendingUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const [kind, setKind] = useState<Exclude<MaterialKind, "file">>("worksheet");
  const [classId, setClassId] = useState(slot?.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<SubjectId>(slot?.subjectId ?? "math");
  const [level, setLevel] = useState<Level>("standard");
  const [withSolutions, setWithSolutions] = useState(true);
  const [title, setTitle] = useState(slot?.topic ?? "");
  const [phase, setPhase] = useState<"form" | "working">("form");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!file) return;
    const g = guessSubject(file.name);
    if (g && !slot) setSubjectId(g);
    if (!slot) setTitle((t) => t || titleFromFileName(file.name));
  }, [file, slot]);

  const accept = async (f: File) => {
    const r = await ingestFile(f);
    if ("error" in r) return toast(r.error);
    setPending(r.meta, r.previewUrl);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void accept(f);
  };

  const ready = Boolean(file) || cloud;
  const step: 1 | 2 | 3 = phase === "working" ? 3 : ready ? 2 : 1;
  const grade = classes.find((c) => c.id === classId)?.grade ?? "";
  const STEPS = [file ? "Διαβάζω το αρχείο" : "Σκέφτομαι το περιεχόμενο", `Προσαρμόζω για ${grade || "την τάξη"}`, withSolutions ? "Ετοιμάζω τις λύσεις" : "Μορφοποιώ τη σελίδα"];
  const canRun = Boolean(classId) && (Boolean(file) || title.trim().length >= 3);

  const run = async () => {
    setPhase("working");
    setProgress(0);
    let blocks: Block[] | undefined;
    if (cloud) {
      // The model works for 10–40 s; move the steps along so the wait feels alive.
      const timer = setInterval(() => setProgress((p) => Math.min(p + 1, STEPS.length - 1)), 6000);
      const r = await aiCreate({
        path: file?.path,
        fileName: file?.name,
        mediaType: file?.type,
        title: title.trim(),
        kindLabel: KIND_LABEL[kind],
        subject: SUBJECTS.find((x) => x.id === subjectId)?.name ?? "",
        grade,
        levelLabel: LEVEL_LABEL[level],
        withSolutions,
      });
      clearInterval(timer);
      if (!r.ok) {
        setPhase("form");
        toast(r.unavailable ? "Η δημιουργία με AI δεν είναι διαθέσιμη αυτή τη στιγμή. Ξαναδοκίμασε αργότερα." : r.error);
        return;
      }
      blocks = r.data;
      setProgress(STEPS.length);
    } else {
      for (let i = 1; i <= STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 550));
        setProgress(i);
      }
    }
    const id = create({
      blocks,
      title: title.trim() || KIND_LABEL[kind],
      classId,
      subjectId,
      kind,
      level,
      withSolutions,
      file,
    });
    if (slot) attach(slot.id, id);
    setPending(undefined);
    router.replace(`/materials/${id}?created=1${slot ? `&slot=${slot.id}` : ""}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={slot ? `/lessons/${slot.id}` : "/materials"} title="Νέο υλικό" subtitle={slot ? `Για: ${subjects.find((s) => s.id === slot.subjectId)?.name} · ${shortDate(slot.date)} ${slot.start}` : undefined} />

      <Card
        className={clsx("mb-5 overflow-hidden transition-colors", drag && "border-brand-500 bg-brand-50")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {file ? (
          <div className="bg-line-2/60 p-5">
            {previewUrl && file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.name} className="mx-auto max-h-56 rounded-md object-contain shadow-paper" />
            ) : file.name === SAMPLE.name && !previewUrl ? (
              <SampleSheet />
            ) : (
              <div className="mx-auto flex w-fit items-center gap-3 rounded-xl bg-surface p-4 shadow-paper">
                <FileBadge file={file} className="size-12" />
                <span className="text-sm">
                  <span className="block font-semibold">{fileKindLabel(file.type, file.name)}</span>
                  <span className="text-muted">{formatBytes(file.size)}</span>
                </span>
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="flex items-center justify-center gap-1.5 font-semibold">
                <CheckCircle2 className="size-5 text-brand-500" /> Το αρχείο ανέβηκε
              </p>
              <p className="text-sm text-muted">{file.name}</p>
              {phase === "form" && (
                <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  <RefreshCw className="size-3.5" /> Άλλο αρχείο
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <CloudUpload className="size-7" />
            </span>
            <p className="mt-3 text-lg font-bold">Ανέβασε το υλικό σου</p>
            <p className="mt-1 text-sm text-muted">Σύρε εδώ ένα PDF, Word ή φωτογραφία σελίδας — έως 25 MB</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="lg" onClick={() => inputRef.current?.click()}>
                <CloudUpload className="size-5" /> Επιλογή αρχείου
              </Button>
              {!cloud && (
                <Button size="lg" variant="secondary" onClick={() => setPending(SAMPLE)}>
                  Δοκίμασε με δείγμα
                </Button>
              )}
            </div>
            {cloud && <p className="mt-4 text-sm text-muted">Ή χωρίς αρχείο: γράψε τίτλο παρακάτω και το AI θα το ετοιμάσει από την αρχή.</p>}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void accept(f);
          }}
        />
      </Card>

      <div className="mb-6">
        <Stepper step={step} />
      </div>

      {phase === "working" ? (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand">
              <Sparkles className="size-5 animate-pulse-soft" />
            </span>
            <div>
              <p className="font-bold">Ετοιμάζω το {KIND_LABEL[kind].toLowerCase()}…</p>
              <p className="text-sm text-muted">{cloud ? "Συνήθως 10–40 δευτερόλεπτα" : "Λίγα δευτερόλεπτα"}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className={cx("flex items-center gap-3 text-sm", i < progress ? "text-ink" : i === progress ? "font-semibold text-ink" : "text-muted")}>
                {i < progress ? <CheckCircle2 className="size-5 text-brand-500" /> : i === progress ? <Loader2 className="size-5 animate-spin text-brand" /> : <span className="size-5 rounded-full border-2 border-line" />}
                {s}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <fieldset disabled={!ready} className={clsx("space-y-5 transition-opacity", !ready && "opacity-50")}>
          {classes.length === 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm">
              Πρόσθεσε πρώτα ένα τμήμα, για να ξέρουμε για ποια τάξη είναι το υλικό.{" "}
              <Link href="/classes" className="font-semibold text-brand underline">
                Τμήματα
              </Link>
            </p>
          )}
          <div>
            <h2 className="mb-3 text-lg font-bold">Τι θα ετοιμάσουμε;</h2>
            <div className="grid grid-cols-2 gap-3">
              {KINDS.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  className={clsx(
                    "flex h-16 items-center gap-3 rounded-xl border px-4 text-left text-sm font-semibold transition-colors",
                    kind === value ? "border-brand-500 bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_var(--color-brand-500)]" : "border-line bg-surface hover:bg-line-2",
                  )}
                >
                  <Icon className="size-5 shrink-0" /> {KIND_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
          <Field label="Τίτλος">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={cx(inputClass, "h-10")} placeholder="π.χ. Πράξεις και προβλήματα" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τμήμα">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.grade}
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
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Επίπεδο δυσκολίας</span>
            <Segmented<Level> value={level} onChange={setLevel} options={(["basic", "standard", "advanced"] as const).map((v) => ({ value: v, label: LEVEL_LABEL[v] }))} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
            <span className="text-[15px] font-medium">Με ξεχωριστές λύσεις</span>
            <Toggle checked={withSolutions} onChange={setWithSolutions} label="Με ξεχωριστές λύσεις" />
          </div>
          <Button size="lg" className="w-full" onClick={run} disabled={!canRun}>
            <Sparkles className="size-5" /> Ετοίμασε το υλικό
          </Button>
          <p className="text-center text-xs text-muted">
            {cloud
              ? "Το AI διαβάζει το αρχείο σου και ετοιμάζει υλικό για την τάξη σου. Ελέγχεις και αλλάζεις τα πάντα πριν το μοιράσεις· το πρωτότυπο μένει ανέγγιχτο."
              : "Στην επίδειξη το υλικό φτιάχνεται από έτοιμα παραδείγματα. Με λογαριασμό το AI διαβάζει το δικό σου αρχείο."}
          </p>
        </fieldset>
      )}
    </div>
  );
}

export default function NewMaterialPage() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}
