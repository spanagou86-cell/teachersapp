import type { Block, Material, MaterialKind } from "./types";

export const MAX_VERSIONS = 40;

export const KIND_LABEL: Record<MaterialKind, string> = {
  worksheet: "Φύλλο εργασίας",
  plan: "Σχέδιο μαθήματος",
  quiz: "Μικρό τεστ",
  summary: "Περίληψη",
  file: "Αρχείο",
};

export const LEVEL_LABEL = { basic: "Απλό", standard: "Βασικό", advanced: "Προχωρημένο" } as const;

/**
 * Replaces the working blocks and records the previous state in the history,
 * so every change can be traced and undone. The original upload is never touched.
 */
export function applyChange(m: Material, blocks: Block[], label: string, versionId: string, at: number): Material {
  const snapshot = { id: versionId, at, label, blocks };
  return {
    ...m,
    blocks,
    versions: [snapshot, ...m.versions].slice(0, MAX_VERSIONS),
    updatedAt: at,
  };
}

/** Restoring is itself a change, so it is recorded and can be reverted too. */
export function restoreVersion(m: Material, versionId: string, newVersionId: string, at: number): Material {
  const v = m.versions.find((x) => x.id === versionId);
  if (!v) return m;
  return applyChange(m, v.blocks, `Επαναφορά: ${v.label.replace(/^(Επαναφορά: )+/, "")}`.slice(0, 200), newVersionId, at);
}

export function restoreOriginal(m: Material, newVersionId: string, at: number): Material {
  return applyChange(m, m.originalBlocks, "Επαναφορά στο πρωτότυπο", newVersionId, at);
}

export function exerciseNumber(blocks: Block[], blockId: string): number | undefined {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "exercise") n++;
    if (b.id === blockId) return b.type === "exercise" ? n : undefined;
  }
  return undefined;
}

export function changedBlockIds(before: Block[], after: Block[]): string[] {
  const prev = new Map(before.map((b) => [b.id, b]));
  return after.filter((b) => JSON.stringify(prev.get(b.id)) !== JSON.stringify(b)).map((b) => b.id);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function fileKindLabel(type: string, name: string): "PDF" | "Word" | "Εικόνα" | "Αρχείο" {
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "PDF";
  if (type.startsWith("image/")) return "Εικόνα";
  if (/\.(docx?|odt)$/i.test(name) || type.includes("word")) return "Word";
  return "Αρχείο";
}

/** Subjects teachers often type in Latin letters (greeklish) in file names. */
const GREEKLISH: [RegExp, string][] = [
  [/^math(imatika|s)?$/, "Μαθηματικά"],
  [/^gl(o|w)ssa$/, "Γλώσσα"],
  [/^meleti$/, "Μελέτη Περιβάλλοντος"],
  [/^istoria$/, "Ιστορία"],
  [/^fysika|^fusika|^physics$/, "Φυσικά"],
  [/^geografia$/, "Γεωγραφία"],
  [/^aggl?ika|^english$/, "Αγγλικά"],
  [/^thriskeftika|^thriskeutika$/, "Θρησκευτικά"],
  [/^eikastika$/, "Εικαστικά"],
  [/^mousiki$/, "Μουσική"],
  [/^fyllo|^fullo$/, "Φύλλο"],
  [/^ergasias|^ergasia$/, "εργασίας"],
  [/^diagwnisma|^diagonisma$/, "Διαγώνισμα"],
  [/^test$/, "Τεστ"],
  [/^askiseis|^askhseis$/, "Ασκήσεις"],
  [/^kef(alaio)?$/, "Κεφάλαιο"],
  [/^enotita$/, "Ενότητα"],
];
const GRADE: Record<string, string> = { a: "Α΄", b: "Β΄", g: "Γ΄", c: "Γ΄", d: "Δ΄", e: "Ε΄", st: "ΣΤ΄", f: "ΣΤ΄" };

/** "mathimatika_d.pdf" → "Μαθηματικά Δ΄"; anything unrecognised is kept, tidied. */
export function titleFromFileName(name: string): string {
  const words = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!words.length) return "Νέο υλικό";
  let known = 0;
  const out = words.map((w, i) => {
    const low = w.toLowerCase();
    const hit = GREEKLISH.find(([re]) => re.test(low));
    if (hit) {
      known++;
      return hit[1];
    }
    if (i > 0 && known && GRADE[low]) return GRADE[low];
    return w;
  });
  const title = out.join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}
