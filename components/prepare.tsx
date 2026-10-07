"use client";

import clsx from "clsx";
import { ArrowRight, ArrowUp, BookOpenCheck, Camera, Check, Plus, FileText, Layers, ListChecks, Loader2, MessageSquareText, PhoneCall, RotateCcw, ShieldCheck, Sparkles, SquareCheckBig, UserCheck, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { KIND_LABEL, LEVEL_LABEL } from "@/lib/materials";
import { aiRead, shrinkImage, type PageReading } from "@/lib/ai/client";
import { pdfFromImages } from "@/lib/pdfFromImages";
import { demoReading, extrasFor, inferKind, LESSON_PACK, PREP, PREP_KINDS, prepRequest, previousTopic, upcoming, whenLabel, type PrepKind } from "@/lib/prepare";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { dismissJob, openJob, retryJob, startJob, useJobs, watchJobs, type Job } from "@/lib/store/jobs";
import { subjectChoices } from "@/lib/subjects";
import type { FileMeta, SubjectId } from "@/lib/types";
import { NoteSheet } from "./capture";
import { useClock } from "./lesson";
import { FileBadge, SubjectIcon } from "./subject";
import { toast } from "./toast";
import { Button, IconButton, Select, Sheet } from "./ui";
import { ACCEPT, ingestFile } from "./upload";

export interface PrepareOptions {
  /** A lesson id, `null` for no lesson, or nothing for the current/next lesson. */
  slotId?: string | null;
  /** Start making this right away (one tap from a lesson or from Today). */
  kind?: PrepKind;
  /** A page or file to build on (e.g. an uploaded worksheet). */
  source?: { meta: FileMeta; url?: string };
  /** Class and subject to start from when there is no lesson. */
  defaults?: { classId: string; subjectId: SubjectId };
  /** A request typed elsewhere (the box on Today): start on it right away. */
  text?: string;
}

export const usePrepare = create<{ open: boolean; options: PrepareOptions; show: (o?: PrepareOptions) => void; hide: () => void }>((set) => ({
  open: false,
  options: {},
  show: (options = {}) => set({ open: true, options }),
  hide: () => set({ open: false, options: {} }),
}));

/** Opens «Ετοίμασε» from anywhere: the bottom bar, Today, a lesson, the materials. */
export const openPrepare = (o?: PrepareOptions) => usePrepare.getState().show(o);

/** What a teacher of that subject would write in «Τι να περιέχει;». */
const PLACEHOLDER: Partial<Record<SubjectId, string>> = {
  math: "π.χ. 6 προβλήματα με ευρώ, τα 2 πρώτα εύκολα, και ένα «εξήγησε πώς σκέφτηκες»",
  glossa: "π.χ. ερωτήσεις κατανόησης για το κείμενο, Αόριστος ρημάτων και μια μικρή έκθεση",
  agglika: "e.g. 8 words about food, gap-fill and a short reading",
  istoria: "π.χ. μια πηγή, χρονολόγιο και ερωτήσεις αιτίας–αποτελέσματος",
  geografia: "π.χ. ασκήσεις με τον χάρτη της Κύπρου και τα σημεία του ορίζοντα",
  fysika: "π.χ. ένα απλό πείραμα με υλικά της τάξης και ερωτήσεις παρατήρησης",
  meleti: "π.χ. παρατήρηση στην αυλή, πίνακας και ερωτήσεις σωστό/λάθος",
};

/** A lesson's worth of pages: the book and the workbook. */
const MAX_PAGES = 6;

/** The pages, and what the AI read on them before making anything. */
function PagesCard({
  photo,
  pages,
  busy,
  reading,
  subjectName,
  lessonSubject,
  onRemove,
  onAdd,
  onRemovePage,
  onRetry,
  onTitle,
  onMatch,
}: {
  photo: { meta: FileMeta; url?: string };
  pages: { url: string }[];
  busy: boolean;
  reading: { busy?: boolean; data?: PageReading; error?: string };
  subjectName: string;
  lessonSubject?: SubjectId;
  onRemove: () => void;
  onAdd: () => void;
  onRemovePage: (i: number) => void;
  onRetry: () => void;
  onTitle: (t: string) => void;
  onMatch: (id: SubjectId) => void;
}) {
  const subjects = useSubjects();
  const d = reading.data;
  const found = d && subjects.find((x) => x.id === d.subjectId);
  const mismatch = d && found && lessonSubject && d.subjectId !== lessonSubject && d.subjectId !== "allo";
  const n = pages.length;
  return (
    <section aria-label="Σελίδες βιβλίου" className="overflow-hidden rounded-xl border border-brand-100 bg-brand-50/50">
      <div className="flex items-center gap-3 p-2 pr-1">
        {n ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-brand ring-1 ring-brand-100">
            <BookOpenCheck className="size-5" />
          </span>
        ) : photo.url && photo.meta.type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="size-12 rounded-md object-cover" />
        ) : (
          <FileBadge file={photo.meta} />
        )}
        <span className="min-w-0 flex-1 text-sm">
          <b className="block">Με βάση τη σελίδα σου{n > 1 ? ` · ${n} σελίδες` : ""}</b>
          <span className="text-muted">{reading.busy ? "Τη διαβάζω…" : d ? "Τη διάβασα· έλεγξε τι βρήκα" : "Διάλεξε τι να φτιάξω από αυτήν"}</span>
        </span>
        <IconButton label="Αφαίρεση όλων των σελίδων" onClick={onRemove}>
          <X className="size-4" />
        </IconButton>
      </div>

      {n > 0 && (
        // One page at a time from the camera: add the next, drop one that came out blurry.
        <ol className="flex gap-2.5 overflow-x-auto px-2.5 pb-2.5 pt-2 [scrollbar-width:none]" aria-label="Σελίδες">
          {pages.map((p, i) => (
            <li key={p.url} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Σελίδα ${i + 1}`} className="h-20 w-16 rounded-lg border border-line bg-surface object-cover shadow-card" />
              <span className="absolute bottom-1 left-1 rounded bg-ink/75 px-1 text-[10.5px] font-bold text-white tabular-nums">{i + 1}</span>
              <button
                type="button"
                aria-label={`Αφαίρεση σελίδας ${i + 1}`}
                disabled={busy}
                onClick={() => onRemovePage(i)}
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-surface text-ink-2 shadow-card ring-1 ring-line hover:text-danger disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {n < MAX_PAGES && (
            <li className="shrink-0">
              <button
                type="button"
                onClick={onAdd}
                disabled={busy}
                className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-100 bg-surface text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Σελίδα
              </button>
            </li>
          )}
        </ol>
      )}

      {reading.busy && (
        <div className="grid gap-2 border-t border-brand-100 bg-surface p-3" aria-live="polite">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
            <Loader2 className="size-4 animate-spin text-brand" /> Αναγνωρίζω μάθημα, ενότητα και στόχους…
          </p>
          <div className="h-2 w-2/3 animate-pulse-soft rounded bg-brand-100" />
          <div className="h-2 w-1/2 animate-pulse-soft rounded bg-brand-100" />
        </div>
      )}

      {reading.error !== undefined && !reading.busy && !d && (
        <div className="flex items-center gap-2 border-t border-brand-100 bg-surface p-3 text-[13px]">
          <span className="min-w-0 flex-1 text-muted">{reading.error || "Δεν διάβασα τη σελίδα· μπορείς να συνεχίσεις κανονικά."}</span>
          {reading.error && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              <RotateCcw className="size-4" /> Ξανά
            </Button>
          )}
        </div>
      )}

      {d && (
        <div className="grid gap-2.5 border-t border-brand-100 bg-surface p-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <Check className="size-3.5" /> Βρήκα
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2 py-0.5 ring-1 ring-line">
              <SubjectIcon id={d.subjectId} size="sm" className="!size-4 [&>svg]:!size-3" />
              {found?.name ?? "Άλλο μάθημα"}
              {d.grade && ` · ${d.grade}`}
            </span>
            {(d.unit || d.pages) && <span className="text-muted">{[d.unit, d.pages && `σελ. ${d.pages}`].filter(Boolean).join(" · ")}</span>}
          </div>
          <input
            value={d.title}
            onChange={(e) => onTitle(e.target.value.slice(0, 120))}
            aria-label="Τίτλος μαθήματος από τη σελίδα"
            className="h-10 rounded-lg bg-bg px-2.5 text-[15px] font-semibold outline-none ring-1 ring-line focus:ring-brand-100"
          />
          {d.objectives.length > 0 && (
            <ul className="grid gap-1 text-[13px] leading-snug text-ink-2">
              {d.objectives.slice(0, 3).map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500" />
                  {o}
                </li>
              ))}
            </ul>
          )}
          {!d.confident && <p className="text-[12.5px] text-amber">Η φωτογραφία δεν διαβάζεται πολύ καθαρά· έλεγξε τα στοιχεία.</p>}
          {mismatch && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-[13px]">
              <span className="min-w-0 flex-1">
                Η σελίδα είναι <b>{found?.name}</b>, ενώ το μάθημα είναι <b>{subjectName}</b>.
              </span>
              <Button size="sm" onClick={() => onMatch(d.subjectId)}>
                {`Κάν' το ${found?.name}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const ICON: Partial<Record<PrepKind, typeof FileText>> = { worksheet: FileText, quiz: SquareCheckBig, levels: Layers, plan: ListChecks };

/** The four results as big tiles, then the subject's own sheets («Για Μαθηματικά: Προβλήματα · Νοερός υπολογισμός»). */
export function PrepareTiles({ onPick, disabled, compact, subjectId }: { onPick: (kind: PrepKind) => void; disabled?: boolean; compact?: boolean; subjectId?: SubjectId }) {
  const subjects = useSubjects();
  const extras = extrasFor(subjectId);
  return (
    <div className="grid grid-cols-1 gap-2.5">
      <div className={clsx("grid grid-cols-2 gap-2", compact && "sm:grid-cols-4")}>
        {PREP_KINDS.map((kind) => {
          const Icon = ICON[kind] ?? FileText;
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => onPick(kind)}
              className="group flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left shadow-card transition-[background-color,border-color,transform] hover:border-brand-100 hover:bg-brand-50/50 active:scale-[0.98] disabled:opacity-50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand transition-colors group-hover:bg-brand-100">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight text-ink">{PREP[kind].title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{PREP[kind].sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {extras.length > 0 && (
        <div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1" role="group" aria-label="Για το μάθημα">
          <span className="mr-0.5 shrink-0 text-[12.5px] font-semibold text-muted">Για {subjects.find((x) => x.id === subjectId)?.name ?? "το μάθημα"}:</span>
          {extras.map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => onPick(kind)}
              title={PREP[kind].sub}
              className="h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {PREP[kind].title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Material still being made, or ready to open. */
function JobRow({ job, onOpen }: { job: Job; onOpen: (job: Job) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5">
      <span className={clsx("flex size-8 shrink-0 items-center justify-center rounded-lg", job.status === "failed" ? "bg-danger-50 text-danger" : "bg-brand-50 text-brand")}>
        {job.status === "running" ? <Loader2 className="size-4 animate-spin" /> : job.status === "done" ? <Check className="size-4" /> : <X className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{job.label}</span>
        <span className={clsx("block truncate text-xs", job.status === "failed" ? "text-danger" : "text-muted")}>
          {job.status === "running" ? "Φτιάχνεται… συνήθως 20–40″" : job.status === "done" ? "Έτοιμο" : job.error}
        </span>
      </span>
      {job.status === "done" && (
        <Button size="sm" variant="soft" onClick={() => onOpen(job)}>
          Άνοιγμα
        </Button>
      )}
      {job.status === "failed" && (
        <>
          <Button size="sm" variant="soft" onClick={() => retryJob(job.id)}>
            <RotateCcw className="size-3.5" /> Ξανά
          </Button>
          <IconButton label="Απόρριψη" onClick={() => dismissJob(job.id)}>
            <X className="size-4" />
          </IconButton>
        </>
      )}
    </li>
  );
}

const STEPS = ["Διαβάζω το μάθημα…", "Γράφω τις ασκήσεις…", "Ελέγχω τις λύσεις…", "Το στήνω σε σελίδα Α4…"];

/** What the teacher sees while the AI works: a page taking shape, never an empty spinner. */
function Working({ job, kind, photo, pack, onLeave, onBack }: { job?: Job; kind: PrepKind; photo: boolean; pack?: boolean; onLeave: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const steps = pack
    ? ["Γράφω το σχέδιο μαθήματος…", "Φτιάχνω το φύλλο εργασίας…", "Ετοιμάζω το τεστ εξόδου…", "Τα βάζω στο μάθημα…"]
    : photo
      ? ["Διαβάζω τη σελίδα του βιβλίου…", ...STEPS.slice(1)]
      : kind === "plan" ? ["Διαβάζω το μάθημα…", "Σχεδιάζω τις φάσεις…", "Το στήνω σε σελίδα…"] : STEPS;
  useEffect(() => {
    const h = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 6000);
    return () => clearInterval(h);
  }, [steps.length]);
  if (job?.status === "failed")
    return (
      <div className="grid justify-items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-danger-50 text-danger">
          <X className="size-6" />
        </span>
        <p className="max-w-xs font-semibold">{job.error}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack}>
            Πίσω
          </Button>
          <Button onClick={() => retryJob(job.id)}>
            <RotateCcw className="size-4" /> Ξαναδοκίμασε
          </Button>
        </div>
      </div>
    );
  return (
    <div className="grid justify-items-center gap-4 py-2 text-center" aria-live="polite">
      <div className="paper w-44 rotate-[-1.5deg] rounded-sm bg-white p-4 shadow-paper" aria-hidden>
        <div className="mx-auto h-2.5 w-24 animate-pulse-soft rounded bg-line" />
        <div className="mt-3 flex gap-2">
          <div className="h-1.5 flex-1 rounded bg-line-2" />
          <div className="h-1.5 w-12 rounded bg-line-2" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={clsx("mt-3 space-y-1.5", i > step && "opacity-25")}>
            <div className="h-1.5 w-full animate-pulse-soft rounded bg-brand-100" style={{ animationDelay: `${i * 150}ms` }} />
            <div className="h-1.5 w-3/4 animate-pulse-soft rounded bg-brand-100" style={{ animationDelay: `${i * 150 + 75}ms` }} />
            <div className="h-px w-full bg-line" />
          </div>
        ))}
      </div>
      <div>
        <p className="flex items-center justify-center gap-2 text-[15px] font-semibold">
          <Loader2 className="size-4 animate-spin text-brand" /> {steps[step]}
        </p>
        <p className="mt-1 text-sm text-muted">Συνήθως 20–40″. Μπορείς να συνεχίσεις άλλη δουλειά· θα σε ειδοποιήσω.</p>
      </div>
      <Button variant="secondary" onClick={onLeave}>
        Συνέχισε σε άλλη δουλειά
      </Button>
    </div>
  );
}

function PrepareBody({ options, onClose }: { options: PrepareOptions; onClose: () => void }) {
  const requested = options.slotId;
  const router = useRouter();
  const clock = useClock();
  const mode = useApp((s) => s.mode);
  const slots = useApp((s) => s.slots);
  const classes = useApp((s) => s.classes);
  const country = useApp((s) => s.profile.country);
  const updateSlot = useApp((s) => s.updateSlot);
  const subjects = useSubjects();
  const jobs = useJobs((s) => s.jobs);
  const next = useMemo(() => upcoming(slots, clock.today, clock.now), [slots, clock.today, clock.now]);

  const [slotId, setSlotId] = useState<string | null>(() => (requested === null ? null : (requested ?? next[0]?.id ?? null)));
  const slot = slotId ? slots.find((s) => s.id === slotId) : undefined;
  const [picking, setPicking] = useState(false);
  const [classId, setClassId] = useState(slot?.classId ?? options.defaults?.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<SubjectId>(slot?.subjectId ?? options.defaults?.subjectId ?? subjectChoices(subjects)[0].id);
  const [topic, setTopic] = useState(slot?.topic ?? "");
  const [text, setText] = useState(options.text ?? "");
  const [photo, setPhoto] = useState<{ meta: FileMeta; url?: string } | undefined>(options.source);
  // Pages photographed here (not a file chosen elsewhere): the AI reads them first.
  const [pages, setPages] = useState<{ file: File; url: string }[]>([]);
  const [bookPdf, setBookPdf] = useState(false);
  const readSeq = useRef(0);
  const [reading, setReading] = useState<{ busy?: boolean; data?: PageReading; error?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [working, setWorking] = useState<{ kind: PrepKind; jobId: string; pack?: boolean }>();
  const [note, setNote] = useState<null | "note" | "parent">(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const cls = slot?.classId ?? classId;
  const sub = slot?.subjectId ?? subjectId;
  const subjectName = subjects.find((s) => s.id === sub)?.name ?? "";
  const cl = classes.find((c) => c.id === cls);
  const previous = slot ? previousTopic(slots, slot) : undefined;
  const watched = jobs.find((j) => j.id === working?.jobId);
  const others = jobs.filter((j) => j.id !== working?.jobId);

  // Finished while the teacher is still here: open it straight away.
  useEffect(() => {
    if (!working) return;
    return watchJobs((job) => {
      if (job.id !== working.jobId) return false;
      onClose();
      if (job.href) router.push(job.href);
      if (working.pack) toast("Έτοιμο όλο το μάθημα: σχέδιο, φύλλο εργασίας και τεστ εξόδου");
      return true;
    });
  }, [working, onClose, router]);

  const choose = (id: string | null) => {
    const s = id ? slots.find((x) => x.id === id) : undefined;
    setSlotId(id);
    setTopic(s?.topic ?? "");
    if (s) {
      setClassId(s.classId);
      setSubjectId(s.subjectId);
    }
    setPicking(false);
  };

  const piece = (kind: PrepKind) => {
    const t = topic.trim() || reading.data?.title || "";
    const grade = cl?.grade ?? "";
    const { title, hint } = prepRequest({ kind, subject: subjectName, grade, topic: t, previous, text, photo: pages.length > 0 || bookPdf, reading: reading.data });
    return {
      t,
      request: { title, kindLabel: KIND_LABEL[PREP[kind].kind], subject: subjectName, subjectId: sub, grade, levelLabel: LEVEL_LABEL.standard, withSolutions: true, hint, country, levels: kind === "levels" },
      material: { title, classId: cls, subjectId: sub, kind: PREP[kind].kind, file: photo?.meta },
    };
  };

  const go = (kind: PrepKind) => {
    if (!cls) return toast("Πρόσθεσε πρώτα ένα τμήμα από τις «Τάξεις».");
    const { t, request, material } = piece(kind);
    // The topic typed here (or read from the book) is the lesson's topic too.
    if (slot && t && t !== slot.topic) updateSlot(slot.id, { topic: t });
    const jobId = startJob({ label: `${PREP[kind].title} · ${t || subjectName}`, request, material, levels: kind === "levels", slotId: slot?.id });
    setWorking({ kind, jobId });
  };

  /** «Όλο το μάθημα»: plan, worksheet and exit test in one go, filed in the lesson. */
  const goLesson = () => {
    if (!cls) return toast("Πρόσθεσε πρώτα ένα τμήμα από τις «Τάξεις».");
    const [first, ...rest] = LESSON_PACK.map((k) => piece(k));
    if (slot && first.t && first.t !== slot.topic) updateSlot(slot.id, { topic: first.t });
    const jobId = startJob({
      label: `Όλο το μάθημα · ${first.t || subjectName}`,
      request: first.request,
      material: first.material,
      slotId: slot?.id,
      pack: rest.map(({ request, material }) => ({ request, material })),
    });
    setWorking({ kind: "plan", jobId, pack: true });
  };

  /** The AI reads the pages first: which subject, which unit, what they teach. */
  const read = async (meta: FileMeta) => {
    const seq = ++readSeq.current;
    setReading({ busy: true });
    const r =
      mode === "cloud"
        ? await aiRead(meta, [subjectName, topic].filter(Boolean).join(" · "))
        : await new Promise<{ ok: true; data: PageReading }>((done) => setTimeout(() => done({ ok: true, data: demoReading(sub, topic) }), 1200));
    // Pages changed meanwhile: only the latest reading counts.
    if (seq !== readSeq.current) return;
    if (!r.ok) return setReading({ error: r.unavailable ? "" : r.error });
    const d = r.data;
    setReading({ data: d });
    // No lesson chosen: the page decides the subject. Same subject: the page is the precise topic.
    if (!slot && d.subjectId !== "allo" && subjects.some((x) => x.id === d.subjectId)) setSubjectId(d.subjectId);
    if (!slot || slot.subjectId === d.subjectId) setTopic(d.title);
  };

  /** The pages as one file: a photo as it is, several photos as one PDF in their order. Then the AI reads them. */
  const applyPages = async (next: { file: File; url: string }[]) => {
    setPages(next);
    if (!next.length) return clearPages();
    setUploading(true);
    try {
      let file = next[0].file;
      if (next.length > 1) {
        const shrunk = await Promise.all(next.map((p) => shrinkImage(p.file, 2000, 0.82)));
        file = new File([await pdfFromImages(shrunk, "Σελίδες βιβλίου")], "Σελίδες βιβλίου.pdf", { type: "application/pdf" });
      }
      const r = await ingestFile(file);
      if ("error" in r) return toast(r.error);
      setPhoto({ meta: r.meta, url: r.previewUrl });
      void read(r.meta);
    } catch {
      toast("Οι σελίδες δεν ανέβηκαν. Δοκίμασε ξανά.");
    } finally {
      setUploading(false);
    }
  };

  /** Photos are added after the ones already there (up to 6); a PDF stands on its own. */
  const addPages = async (list: File[]) => {
    const isPdf = (f: File) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
    const pdf = list.find(isPdf);
    if (pdf) {
      setPages([]);
      setBookPdf(true);
      setUploading(true);
      const r = await ingestFile(pdf);
      setUploading(false);
      if ("error" in r) return toast(r.error);
      setPhoto({ meta: r.meta, url: r.previewUrl });
      return void read(r.meta);
    }
    const images = list.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (!images.length) return;
    const room = MAX_PAGES - pages.length;
    if (images.length > room) toast(`Έως ${MAX_PAGES} σελίδες κάθε φορά· για περισσότερες, ανέβασε PDF.`);
    setBookPdf(false);
    await applyPages([...pages, ...images.slice(0, Math.max(room, 0)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const clearPages = () => {
    readSeq.current++;
    setPhoto(undefined);
    setPages([]);
    setBookPdf(false);
    setReading({});
  };

  // Opened with a tile already chosen: start at once, exactly as a tap on the tile would.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (options.kind) go(options.kind);
    else if (options.text?.trim()) go(inferKind(options.text));
    // A file chosen elsewhere («Φτιάξε φύλλο από αυτό»): read it too.
    else if (options.source) void read(options.source.meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (note)
    return (
      <NoteSheet
        open
        defaultKind={note}
        onClose={() => {
          setNote(null);
          onClose();
        }}
      />
    );

  return (
    <Sheet open onClose={onClose} title="Ετοίμασε">
      {working ? (
        <Working
          job={watched}
          kind={working.kind}
          photo={Boolean(photo)}
          pack={working.pack}
          onLeave={onClose}
          onBack={() => {
            dismissJob(working.jobId);
            setWorking(undefined);
          }}
        />
      ) : (
        <div className="grid gap-4">
          {others.length > 0 && (
            <ul className="grid gap-2" aria-label="Υλικό που φτιάχνεται">
              {others.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  onOpen={(job) => {
                    onClose();
                    openJob(job);
                  }}
                />
              ))}
            </ul>
          )}

          <section aria-label="Για ποιο μάθημα" className="overflow-hidden rounded-xl border border-line bg-bg">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              aria-label="Αλλαγή μαθήματος"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-line-2"
            >
              <SubjectIcon id={sub} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{slot ? `${subjectName} · ${cl?.name ?? ""}` : "Χωρίς συγκεκριμένο μάθημα"}</span>
                <span className="block truncate text-xs text-muted">{slot ? whenLabel(slot, clock.today) : "Διάλεξε τμήμα και μάθημα"}</span>
              </span>
              <span className="text-[13px] font-semibold text-brand-500">Αλλαγή</span>
            </button>
            {picking && (
              <ul className="max-h-64 divide-y divide-line-2 overflow-y-auto border-t border-line bg-surface" role="listbox" aria-label="Μαθήματα">
                {next.map((s) => (
                  <li key={s.id}>
                    <button type="button" role="option" aria-selected={s.id === slotId} onClick={() => choose(s.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-line-2">
                      <SubjectIcon id={s.subjectId} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">
                          {subjects.find((x) => x.id === s.subjectId)?.name} · {classes.find((c) => c.id === s.classId)?.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {whenLabel(s, clock.today)}
                          {s.topic && ` · ${s.topic}`}
                          {s.materialIds.length > 0 && " · έχει υλικό"}
                        </span>
                      </span>
                      {s.id === slotId && <Check className="size-4 text-brand" />}
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" role="option" aria-selected={slotId === null} onClick={() => choose(null)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] font-semibold hover:bg-line-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-line-2 text-muted">
                      <Sparkles className="size-4" />
                    </span>
                    Χωρίς συγκεκριμένο μάθημα
                  </button>
                </li>
              </ul>
            )}
            {!slot && !picking && (
              <div className="grid grid-cols-2 gap-2 border-t border-line-2 px-3 py-2.5">
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
            )}
            <label className="flex items-center gap-3 border-t border-line-2 bg-surface px-3">
              <span className="text-[13px] font-semibold text-muted">Θέμα</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={120}
                aria-label="Θέμα μαθήματος"
                placeholder={previous ? `μετά το «${previous}»` : "π.χ. Κλάσματα: ισοδύναμα"}
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/70 sm:text-[15px]"
              />
            </label>
          </section>

          {/* The teacher's own words first: what the sheet or the lesson should have. */}
          <form
            className="grid gap-2 rounded-xl border border-line bg-surface p-2.5 focus-within:border-brand-100 focus-within:ring-2 focus-within:ring-brand-50"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) go(inferKind(text));
            }}
          >
            <label className="px-1 text-[13px] font-semibold text-ink-2" htmlFor="prep-text">
              Τι να περιέχει; <span className="font-normal text-muted">(προαιρετικό)</span>
            </label>
            <textarea
              id="prep-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={2}
              aria-label="Τι θέλεις να ετοιμάσω"
              placeholder={PLACEHOLDER[sub] ?? "π.χ. 6 ασκήσεις, οι 2 πρώτες εύκολες, με εικόνες"}
              className="min-h-14 resize-none bg-transparent px-1 !outline-none text-base leading-snug text-ink outline-none placeholder:text-muted/70 sm:text-[15px]"
            />
            <div className="flex items-center gap-2">
              {!photo && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-bg px-3 text-[13px] font-semibold text-ink-2 ring-1 ring-line transition-colors hover:bg-line-2 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {uploading ? "Ανεβαίνουν…" : "Σελίδες βιβλίου"}
                </button>
              )}
              <span className="flex-1" />
              <button
                type="submit"
                aria-label="Ετοίμασέ το"
                disabled={!text.trim() || uploading}
                className="flex size-9 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-brand/20"
              >
                <ArrowUp className="size-4" strokeWidth={2.2} />
              </button>
            </div>
          </form>
          <input
            ref={photoRef}
            type="file"
            hidden
            multiple
            accept={ACCEPT}
            aria-label="Σελίδες βιβλίου"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              void addPages(list);
            }}
          />

          {photo && (
            <PagesCard
              photo={photo}
              pages={pages}
              busy={uploading}
              onAdd={() => photoRef.current?.click()}
              onRemovePage={(i) => void applyPages(pages.filter((_, j) => j !== i))}
              reading={reading}
              subjectName={subjectName}
              lessonSubject={slot?.subjectId}
              onRemove={clearPages}
              onRetry={() => void read(photo.meta)}
              onTitle={(t) => (setTopic(t), setReading((r) => (r.data ? { data: { ...r.data, title: t } } : r)))}
              onMatch={(id) => {
                const match = next.find((s) => s.subjectId === id && s.classId === cls) ?? next.find((s) => s.subjectId === id);
                if (match) choose(match.id);
                else {
                  choose(null);
                  setSubjectId(id);
                }
                if (reading.data) setTopic(reading.data.title);
              }}
            />
          )}

          <button
            type="button"
            onClick={goLesson}
            disabled={uploading || reading.busy}
            className="group flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#14275f,#1e3a8a_60%,#2c4fb0)] p-3.5 text-left text-white shadow-lift transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <BookOpenCheck className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Όλο το μάθημα</span>
              <span className="block text-[12.5px] leading-snug text-white/75">Σχέδιο 40′ · φύλλο εργασίας · τεστ εξόδου{slot ? ", μέσα στο μάθημα" : ""}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
          </button>

          <PrepareTiles onPick={go} disabled={uploading || reading.busy} subjectId={sub} />

          <p className="-mt-2 flex items-start gap-1.5 text-xs text-muted">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            {mode === "cloud"
              ? "Στο AI πάει μόνο το μάθημα, το θέμα και ό,τι γράψεις εδώ· η εφαρμογή δεν στέλνει ονόματα μαθητών. Έλεγξε το φύλλο πριν το μοιράσεις."
              : "Στην επίδειξη βλέπεις δείγμα. Με λογαριασμό το AI το φτιάχνει για το θέμα σου."}
          </p>

          <div className="flex flex-wrap items-center gap-1 border-t border-line-2 pt-3 text-[13px]">
            <span className="mr-1 text-muted">Γρήγορα:</span>
            <Link
              href={cls ? `/classes/${cls}?date=${clock.today}` : "/classes"}
              onClick={onClose}
              className="flex h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-ink-2 hover:bg-line-2"
            >
              <UserCheck className="size-4" /> Απουσίες
            </Link>
            <button type="button" onClick={() => setNote("note")} className="flex h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-ink-2 hover:bg-line-2">
              <MessageSquareText className="size-4" /> Σημείωση
            </button>
            <button type="button" onClick={() => setNote("parent")} className="flex h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-ink-2 hover:bg-line-2">
              <PhoneCall className="size-4" /> Γονέας
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** The «Ετοίμασε» sheet, mounted once by the app shell. */
export function PrepareSheet() {
  const { open, options, hide } = usePrepare();
  if (!open) return null;
  return <PrepareBody options={options} onClose={hide} />;
}

/** True while something is being made; `ready` when a result waits to be opened. */
export function useJobState() {
  const running = useJobs((s) => s.jobs.some((j) => j.status === "running"));
  const ready = useJobs((s) => s.jobs.some((j) => j.status === "done"));
  return { running, ready };
}
