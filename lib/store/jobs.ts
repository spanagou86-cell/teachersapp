"use client";

import { create } from "zustand";
import { toast } from "@/components/toast";
import { aiCreate, type CreateRequest } from "../ai/client";
import { buildBlocks, withLevel } from "../ai/templates";
import { uid } from "../id";
import type { Block, FileMeta, Level, MaterialKind, SubjectId } from "../types";
import { useApp } from ".";

/** Material being made in the background, so the teacher can keep working meanwhile. */
export interface Job {
  id: string;
  label: string;
  status: "running" | "done" | "failed";
  /** Where the result opens: the new material, or the lesson that got all three levels. */
  href?: string;
  error?: string;
}

export interface JobInput {
  label: string;
  request: Omit<CreateRequest, "path" | "fileName" | "mediaType">;
  material: { title: string; classId: string; subjectId: SubjectId; kind: Exclude<MaterialKind, "file">; file?: FileMeta };
  /** Split the result into three sheets: Επίπεδο Α, Β, Γ. */
  levels?: boolean;
  slotId?: string;
}

export const useJobs = create<{ jobs: Job[] }>(() => ({ jobs: [] }));

const inputs = new Map<string, JobInput>();
const patch = (id: string, p: Partial<Job>) => useJobs.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) }));

export function dismissJob(id: string) {
  inputs.delete(id);
  useJobs.setState((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
}

let navigate = (href: string) => window.location.assign(href);
/** The app's router, so a finished job opens without reloading the page. */
export const setJobNavigator = (fn: (href: string) => void) => {
  navigate = fn;
};

export function openJob(job: Job) {
  if (job.href) navigate(job.href);
  dismissJob(job.id);
}

/** Someone watching the job (the open «Ετοίμασε» sheet) opens the result itself instead of a toast. */
const watchers = new Set<(job: Job) => boolean>();
export function watchJobs(fn: (job: Job) => boolean) {
  watchers.add(fn);
  return () => void watchers.delete(fn);
}

if (typeof window !== "undefined")
  window.addEventListener("beforeunload", (e) => {
    if (useJobs.getState().jobs.some((j) => j.status === "running")) e.preventDefault();
  });

const LEVELS: [Level, string][] = [
  ["basic", "Α"],
  ["standard", "Β"],
  ["advanced", "Γ"],
];

/** Starts making the material; returns the job's id right away. */
export function startJob(input: JobInput): string {
  const id = uid();
  void run(id, input);
  return id;
}

export function retryJob(id: string): string | undefined {
  const input = inputs.get(id);
  dismissJob(id);
  return input && startJob(input);
}

/** Makes the material, files it (and attaches it to the lesson), then says it's ready. */
async function run(id: string, input: JobInput): Promise<void> {
  const job: Job = { id, label: input.label, status: "running" };
  inputs.set(job.id, input);
  // Finished jobs make way for the new one; running ones stay.
  useJobs.setState((s) => ({ jobs: [...s.jobs.filter((j) => j.status === "running"), job] }));
  const start = useApp.getState();
  const stillHere = () => useApp.getState().mode === start.mode && useApp.getState().userId === start.userId;

  let blocks: Block[] | undefined;
  if (start.mode === "cloud") {
    const r = await aiCreate({ ...input.request, path: input.material.file?.path, fileName: input.material.file?.name, mediaType: input.material.file?.type });
    if (!stillHere()) return dismissJob(job.id);
    if (!r.ok) {
      const error = r.unavailable ? "Η δημιουργία με AI δεν είναι διαθέσιμη αυτή τη στιγμή. Ξαναδοκίμασε σε λίγο." : r.error;
      patch(job.id, { status: "failed", error });
      toast(error);
      return;
    }
    blocks = r.data;
  } else {
    // The demo has no model: a short pause, then content from the built-in examples.
    await new Promise((r) => setTimeout(r, 1500));
    if (!stillHere()) return dismissJob(job.id);
  }

  const { createMaterial, attachMaterial, classes } = useApp.getState();
  const make = (title: string, level: Level, b?: Block[]) => {
    const id = createMaterial({ ...input.material, title, level, withSolutions: true, blocks: b });
    if (input.slotId) attachMaterial(input.slotId, id);
    return id;
  };
  let href: string;
  let done: string;
  if (input.levels) {
    const source =
      blocks ??
      buildBlocks({
        subjectId: input.material.subjectId,
        kind: input.material.kind,
        level: "standard",
        grade: classes.find((c) => c.id === input.material.classId)?.grade ?? "",
        hint: input.material.title,
        prefix: uid().slice(0, 8),
      });
    // One answer, three sheets: each level is its own material, printed as Επίπεδο Α, Β or Γ.
    const ids = LEVELS.map(([level, letter]) => make(`${input.material.title} · Επίπεδο ${letter}`, level, source.map((b) => ({ ...withLevel(b, level), id: uid() }))));
    href = input.slotId ? `/lessons/${input.slotId}` : `/materials/${ids[1]}`;
    done = "Έτοιμα τα 3 φύλλα: Α, Β, Γ";
  } else {
    const id = make(input.material.title, "standard", blocks);
    href = `/materials/${id}?created=1${input.slotId ? `&slot=${input.slotId}` : ""}`;
    done = `Έτοιμο: «${input.material.title}»`;
  }
  const finished: Job = { ...job, status: "done", href };
  patch(job.id, finished);
  for (const w of watchers) if (w(finished)) return dismissJob(job.id);
  toast(done, { label: "Άνοιγμα", run: () => openJob(finished) });
}
