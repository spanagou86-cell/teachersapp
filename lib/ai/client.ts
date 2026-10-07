"use client";

import { uid } from "../id";
import type { Block, Level, Variant } from "../types";
import { adaptMaterial, type AdaptInput, type AdaptResult, type QuickAction } from "./mock";

/** What the browser gets back from /api/ai. */
export type AiAnswer<T> = { ok: true; data: T } | { ok: false; error: string; unavailable?: boolean };

async function post<T>(body: object): Promise<AiAnswer<T>> {
  try {
    const res = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: json as T };
    if (res.status === 503 && json.error === "not-configured") return { ok: false, error: "", unavailable: true };
    return { ok: false, error: json.error || "Κάτι πήγε στραβά. Ξαναδοκίμασε." };
  } catch {
    return { ok: false, error: "Δεν υπάρχει σύνδεση στο διαδίκτυο." };
  }
}

const LEVELS: Level[] = ["basic", "standard", "advanced"];

function variant(raw: unknown): Variant | undefined {
  const r = raw as Record<string, unknown> | undefined;
  const text = typeof r?.text === "string" ? r.text.trim().slice(0, 4000) : "";
  if (!text) return undefined;
  const answer = typeof r?.answer === "string" ? r.answer.trim().slice(0, 2000) : "";
  return answer ? { text, answer } : { text };
}

/** Model output → safe blocks: known types, trimmed text, fresh ids where needed. */
export function cleanBlocks(raw: unknown, keep: Set<string> = new Set()): Block[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Block[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") continue;
    const type = r.type === "heading" || r.type === "text" || r.type === "exercise" ? r.type : undefined;
    const text = typeof r.text === "string" ? r.text.trim().slice(0, 4000) : "";
    if (!type || !text) continue;
    let id = typeof r.id === "string" && keep.has(r.id) && !seen.has(r.id) ? r.id : uid();
    if (seen.has(id)) id = uid();
    seen.add(id);
    const block: Block = { id, type, text };
    if (type === "exercise") {
      if (typeof r.answer === "string" && r.answer.trim()) block.answer = r.answer.trim().slice(0, 2000);
      block.lines = typeof r.lines === "number" ? Math.max(0, Math.min(12, Math.round(r.lines))) : 2;
      if (LEVELS.includes(r.level as Level)) block.level = r.level as Level;
      // Three levels of the same exercise: the block's own wording is the middle one.
      const basic = variant(r.basic);
      const advanced = variant(r.advanced);
      if (basic || advanced)
        block.variants = { standard: { text: block.text, ...(block.answer && { answer: block.answer }) }, ...(basic && { basic }), ...(advanced && { advanced }) };
    }
    out.push(block);
  }
  return out;
}

export interface CreateRequest {
  path?: string;
  fileName?: string;
  mediaType?: string;
  title: string;
  kindLabel: string;
  subject: string;
  grade: string;
  levelLabel: string;
  withSolutions: boolean;
  /** What the teacher asked for, in their words and the app's (topic, kind of sheet, free text). */
  hint?: string;
  country?: "gr" | "cy";
  /** Ask for an easier and a harder version of every exercise. */
  levels?: boolean;
}

export async function aiCreate(req: CreateRequest): Promise<AiAnswer<Block[]>> {
  const r = await post<{ blocks: unknown }>({ op: "create", ...req });
  if (!r.ok) return r;
  const blocks = cleanBlocks(r.data.blocks);
  return blocks.length ? { ok: true, data: blocks } : { ok: false, error: "Το AI δεν επέστρεψε περιεχόμενο. Ξαναδοκίμασε." };
}

/** Actions done in the browser at no cost, before or without the model. */
const LOCAL: QuickAction[] = ["bw", "space"];

export async function aiAdapt(input: AdaptInput & { subject: string; grade: string; demo: boolean }): Promise<AiAnswer<AdaptResult & { simulated?: boolean }>> {
  const remoteActions = input.actions.filter((a) => !LOCAL.includes(a));
  const needsModel = remoteActions.length > 0 || input.prompt.trim().length > 0;
  if (input.demo || !needsModel) return { ok: true, data: { ...adaptMaterial(input), simulated: input.demo && needsModel } };

  const r = await post<{ blocks: unknown; versionB?: unknown; summary?: string }>({
    op: "adapt",
    // Charts stay as they are; the model only sees text.
    blocks: input.blocks.filter((b) => b.type !== "chart").map(({ id, type, text, answer, lines, level }) => ({ id, type, text, answer, lines, level })),
    actions: remoteActions,
    prompt: input.prompt,
    target: input.targetId,
    subject: input.subject,
    grade: input.grade,
  });
  if (!r.ok) {
    // No key on the server yet: keep the editor useful with the built-in rules.
    if (r.unavailable) return { ok: true, data: { ...adaptMaterial(input), simulated: true } };
    return r;
  }
  const keep = new Set(input.blocks.map((b) => b.id));
  let blocks = cleanBlocks(r.data.blocks, keep);
  if (!blocks.length) return { ok: false, error: "Το AI δεν επέστρεψε περιεχόμενο. Ξαναδοκίμασε." };
  input.blocks.forEach((b, i) => {
    if (b.type !== "chart") return;
    const prev = input.blocks[i - 1];
    const at = prev ? blocks.findIndex((x) => x.id === prev.id) : -1;
    blocks.splice(at >= 0 ? at + 1 : Math.min(i, blocks.length), 0, b);
  });
  // Free local touches on top of the model's answer.
  const local = input.actions.filter((a) => LOCAL.includes(a));
  if (local.length) blocks = adaptMaterial({ blocks, actions: local, prompt: "", targetId: input.targetId }).blocks;

  const before = new Map(input.blocks.map((b) => [b.id, JSON.stringify(b)]));
  const changedIds = blocks.filter((b) => {
    const prev = before.get(b.id);
    if (!prev) return true;
    const p = JSON.parse(prev) as Block;
    return p.text !== b.text || (p.answer ?? "") !== (b.answer ?? "") || (p.lines ?? 2) !== (b.lines ?? 2) || p.type !== b.type;
  }).map((b) => b.id);
  if (!changedIds.length && blocks.length !== input.blocks.length) changedIds.push(blocks[0].id);
  // Keep the extra data (charts, level variants) of blocks the model left in place.
  const original = new Map(input.blocks.map((b) => [b.id, b]));
  blocks = blocks.map((b) => (original.has(b.id) && !changedIds.includes(b.id) ? original.get(b.id)! : { ...original.get(b.id), ...b, variants: undefined, variantB: undefined }));
  const versionB = cleanBlocks(r.data.versionB);

  const extras: string[] = [];
  if (input.actions.includes("space")) extras.push("περισσότερος χώρος για απαντήσεις");
  if (input.actions.includes("bw")) extras.push("ασπρόμαυρη εκτύπωση");
  const summary = [r.data.summary?.trim(), extras.length ? `Επίσης: ${extras.join(", ")}.` : ""].filter(Boolean).join(" ");

  return {
    ok: true,
    data: {
      blocks,
      versionB: input.actions.includes("versionAB") && versionB.length ? versionB : undefined,
      withSolutions: input.actions.includes("solutions") || undefined,
      blackAndWhite: input.actions.includes("bw") || undefined,
      summary: summary || "Η πρόταση είναι έτοιμη.",
      changedIds,
      partial: false,
    },
  };
}

export interface ReadEntry {
  weekday: number;
  start: string;
  end: string;
  kind: "lesson" | "duty" | "free" | "meeting";
  className?: string;
  subject?: string;
  label?: string;
}

export async function aiReadTimetable(
  file: { data: string; mediaType: string },
  teacher: string,
  classes: string[],
  country: "gr" | "cy",
): Promise<AiAnswer<{ entries: ReadEntry[]; notes?: string }>> {
  const r = await post<{ entries: unknown; notes?: string }>({ op: "timetable", ...file, teacher, classes: classes.join(", "), country });
  if (!r.ok) return r.unavailable ? { ok: false, error: "Η αυτόματη ανάγνωση δεν είναι ακόμη ενεργή. Συμπλήρωσε το πρόγραμμα με το χέρι." } : r;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const entries = (Array.isArray(r.data.entries) ? (r.data.entries as ReadEntry[]) : []).filter(
    (e) => e && e.weekday >= 1 && e.weekday <= 5 && time.test(e.start) && time.test(e.end) && e.start < e.end && ["lesson", "duty", "free", "meeting"].includes(e.kind),
  );
  if (!entries.length) return { ok: false, error: "Δεν διάβασα ώρες σε αυτή την εικόνα. Δοκίμασε πιο καθαρή φωτογραφία, ίσια και με καλό φως." };
  return { ok: true, data: { entries, notes: r.data.notes } };
}

/** Phone photos are large; shrink them before upload so they stay fast and cheap to read. */
export async function shrinkImage(file: Blob, max = 2000, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 900_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    return out && out.size < file.size ? out : file;
  } catch {
    // HEIC and other formats the browser can't decode stay as they are.
    return file;
  }
}

export async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export interface RosterName {
  firstName: string;
  lastName: string;
}

const tidyName = (s: unknown) =>
  typeof s === "string"
    ? s
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60)
    : "";

/** Photo or PDF of a class list → names to review before adding. */
export async function aiReadRoster(file: Blob, className: string): Promise<AiAnswer<{ students: RosterName[]; notes?: string }>> {
  const isPdf = file.type === "application/pdf";
  const blob = isPdf ? file : await shrinkImage(file, 2000, 0.85);
  if (blob.size > 3_000_000) return { ok: false, error: "Το αρχείο είναι μεγάλο. Δοκίμασε φωτογραφία ή PDF μιας σελίδας." };
  const mediaType = isPdf ? "application/pdf" : ["image/jpeg", "image/png", "image/webp"].includes(blob.type) ? blob.type : "";
  if (!mediaType) return { ok: false, error: "Αυτή η φωτογραφία δεν διαβάζεται. Τράβηξέ τη ξανά από την κάμερα." };
  const r = await post<{ students: unknown; notes?: string }>({ op: "roster", data: await toBase64(blob), mediaType, className });
  if (!r.ok) return r.unavailable ? { ok: false, error: "Η ανάγνωση από φωτογραφία δεν είναι ενεργή αυτή τη στιγμή. Γράψε ή επικόλλησε τα ονόματα." } : r;
  const seen = new Set<string>();
  const students = (Array.isArray(r.data.students) ? (r.data.students as Record<string, unknown>[]) : [])
    .map((x) => ({ firstName: tidyName(x?.firstName), lastName: tidyName(x?.lastName) }))
    .filter((x) => x.firstName && !seen.has(`${x.firstName}|${x.lastName}`) && seen.add(`${x.firstName}|${x.lastName}`));
  if (!students.length) return { ok: false, error: "Δεν βρήκα ονόματα σε αυτή την εικόνα. Δοκίμασε πιο καθαρή φωτογραφία, ίσια και με καλό φως." };
  return { ok: true, data: { students, notes: r.data.notes } };
}

export interface ReadSyllabus {
  source: "cy-maths" | "file";
  /** Grade index 0–5 (Α΄–ΣΤ΄) for the Ministry's programme. */
  grade?: number;
  file?: { data: string; mediaType: string };
  subject: string;
  gradeLabel: string;
}

/** The syllabus of a subject, from the Ministry's programme or a photo/PDF of the book's contents. */
export async function aiReadSyllabus(req: ReadSyllabus): Promise<AiAnswer<{ items: { unit?: string; title: string; periods: number }[]; notes?: string }>> {
  const r = await post<{ items: unknown; notes?: string }>({ op: "syllabus", source: req.source, grade: req.grade, ...req.file, subject: req.subject, gradeLabel: req.gradeLabel });
  if (!r.ok) return r.unavailable ? { ok: false, error: "Η ανάγνωση με AI δεν είναι ενεργή αυτή τη στιγμή. Γράψε ή επικόλλησε τα θέματα." } : r;
  const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, n) : "");
  const items = (Array.isArray(r.data.items) ? (r.data.items as Record<string, unknown>[]) : [])
    .map((x) => ({ unit: clip(x?.unit, 120) || undefined, title: clip(x?.title, 160), periods: Math.max(1, Math.min(40, Math.round(Number(x?.periods)) || 1)) }))
    .filter((x) => x.title);
  if (!items.length) return { ok: false, error: "Δεν βρήκα θέματα εδώ. Δοκίμασε πιο καθαρή φωτογραφία των περιεχομένων." };
  return { ok: true, data: { items, notes: r.data.notes } };
}
