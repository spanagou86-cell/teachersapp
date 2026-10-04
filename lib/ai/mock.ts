import { exerciseNumber } from "../materials";
import type { Block, Level } from "../types";
import { withLevel } from "./templates";

export type QuickAction = "simpler" | "harder" | "versionAB" | "solutions" | "space" | "bw";

export const QUICK_ACTIONS: { id: QuickAction; label: string }[] = [
  { id: "simpler", label: "Πιο απλό" },
  { id: "harder", label: "Πιο απαιτητικό" },
  { id: "versionAB", label: "Εκδοχή Α / Β" },
  { id: "solutions", label: "Πρόσθεσε λύσεις" },
  { id: "space", label: "Περισσότερος χώρος" },
  { id: "bw", label: "Ασπρόμαυρο" },
];

export interface AdaptInput {
  blocks: Block[];
  actions: QuickAction[];
  prompt: string;
  /** Exercise the teacher selected in the editor, if any. */
  targetId?: string;
}

export interface AdaptResult {
  blocks: Block[];
  /** Blocks for a version B sheet, when requested. */
  versionB?: Block[];
  withSolutions?: boolean;
  blackAndWhite?: boolean;
  summary: string;
  changedIds: string[];
  /** True when the free-text prompt contained something the demo couldn't interpret. */
  partial: boolean;
}

const ORDINALS: [RegExp, number][] = [
  [/πρώτ/i, 1], [/δεύτερ/i, 2], [/τρίτ/i, 3], [/τέταρτ/i, 4], [/πέμπτ/i, 5],
];

const LEVELS: Level[] = ["basic", "standard", "advanced"];

export function parsePrompt(prompt: string): { actions: QuickAction[]; exercise?: number } {
  const p = prompt.toLowerCase();
  const actions: QuickAction[] = [];
  if (/απλ|ευκολ|εύκολ/.test(p)) actions.push("simpler");
  if (/δύσκολ|δυσκολ|απαιτητ|πιο προχωρ/.test(p)) actions.push("harder");
  if (/λύσ|απαντήσ/.test(p)) actions.push("solutions");
  if (/χώρο|χωρο|γραμμ/.test(p)) actions.push("space");
  if (/ασπρόμαυρ|ασπρομαυρ|εκτυπ/.test(p)) actions.push("bw");
  if (/εκδοχ|α\s*\/\s*β/.test(p)) actions.push("versionAB");
  let exercise: number | undefined;
  const num = p.match(/άσκηση\s*(\d+)|(\d+)\s*η?\s*άσκηση/);
  if (num) exercise = Number(num[1] ?? num[2]);
  else exercise = ORDINALS.find(([re]) => re.test(p))?.[1];
  return { actions, exercise };
}

function shift(block: Block, dir: -1 | 1): Block {
  const current = LEVELS.indexOf(block.level ?? "standard");
  const next = LEVELS[Math.max(0, Math.min(2, current + dir))];
  if (block.variants?.[next] && next !== block.level) return withLevel(block, next);
  // Exercises the teacher wrote by hand have no variants; adjust the wording instead.
  const help = "Βοήθεια: χώρισε το πρόβλημα σε μικρά βήματα.";
  const push = "Εξήγησε πώς σκέφτηκες.";
  const base = block.text.replace(`\n${help}`, "").replace(`\n${push}`, "");
  return { ...block, level: next, text: `${base}\n${dir < 0 ? help : push}` };
}

/** Deterministic stand-in for the model call. Never mutates the input. */
export function adaptMaterial({ blocks, actions: quick, prompt, targetId }: AdaptInput): AdaptResult {
  const parsed = parsePrompt(prompt);
  const actions = new Set<QuickAction>([...quick, ...parsed.actions]);

  let target: string | undefined = targetId;
  if (parsed.exercise) {
    let n = 0;
    target = blocks.find((b) => b.type === "exercise" && ++n === parsed.exercise)?.id ?? target;
  }
  const inScope = (b: Block) => b.type === "exercise" && (!target || b.id === target);

  let out = blocks.map((b) => ({ ...b }));
  const notes: string[] = [];
  const scopeLabel = target ? `την ${exerciseNumber(blocks, target)}η άσκηση` : "όλες τις ασκήσεις";

  if (actions.has("simpler")) {
    out = out.map((b) => (inScope(b) ? shift(b, -1) : b));
    notes.push(`απλούστερη διατύπωση για ${scopeLabel}`);
  } else if (actions.has("harder")) {
    out = out.map((b) => (inScope(b) ? shift(b, 1) : b));
    notes.push(`πιο απαιτητική εκδοχή για ${scopeLabel}`);
  }
  if (actions.has("space")) {
    out = out.map((b) => (inScope(b) ? { ...b, lines: Math.min((b.lines ?? 2) + 2, 8) } : b));
    notes.push("περισσότερο χώρο για απαντήσεις");
  }

  const prompted = prompt.trim().length > 0;
  const understood = parsed.actions.length > 0;
  if (prompted && !understood && !quick.length) {
    out = out.map((b) => (inScope(b) && !b.text.includes("Υπόδειξη:") ? { ...b, text: `${b.text}\nΥπόδειξη: υπογράμμισε πρώτα τα δεδομένα.` } : b));
    notes.push(`μια υπόδειξη για ${scopeLabel}`);
  }

  const changedIds = out.filter((b, i) => JSON.stringify(b) !== JSON.stringify(blocks[i])).map((b) => b.id);
  const versionB = actions.has("versionAB")
    ? out.map((b) => (b.type === "exercise" && b.variantB ? { ...b, text: b.variantB.text, answer: b.variantB.answer } : b))
    : undefined;
  if (versionB) notes.push("δεύτερη εκδοχή (Β) με διαφορετικά δεδομένα, για να μην αντιγράφουν οι διπλανοί");
  if (actions.has("solutions")) notes.push("φύλλο λύσεων");
  if (actions.has("bw")) notes.push("ασπρόμαυρη εκτύπωση");

  const summary = notes.length
    ? `Προτείνω ${notes.join(", ")}.`
    : "Δεν βρήκα κάποια αλλαγή να προτείνω. Δοκίμασε μια από τις γρήγορες επιλογές.";

  return {
    blocks: out,
    versionB,
    withSolutions: actions.has("solutions") || undefined,
    blackAndWhite: actions.has("bw") || undefined,
    summary,
    changedIds,
    partial: prompted && !understood,
  };
}
