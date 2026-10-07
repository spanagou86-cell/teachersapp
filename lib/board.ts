import type { Block } from "./types";

/** One screen on the class board. */
export interface Slide {
  kind: "title" | "exercise" | "section";
  title: string;
  /** Text shown above the exercise: the sheet's instructions or the section's paragraphs. */
  body: string[];
  /** Exercise number on the sheet (1, 2, 3…). */
  n?: number;
  answer?: string;
  chart?: Block["chart"];
}

/**
 * A sheet becomes slides: its title with the instructions, then one exercise per screen
 * (with the sheet's chart beside the questions about it); a lesson plan becomes one screen per phase.
 */
export function toSlides(title: string, blocks: Block[]): Slide[] {
  const slides: Slide[] = [];
  const first = blocks[0]?.type === "heading" ? blocks[0] : undefined;
  const intro: Slide = { kind: "title", title: first?.text || title, body: [] };
  slides.push(intro);
  let chart: Block["chart"];
  let section: Slide | undefined;
  let n = 0;
  for (const b of blocks.slice(first ? 1 : 0)) {
    if (b.type === "chart" && b.chart) {
      chart = b.chart;
      if (!n && !section) intro.chart = b.chart;
    } else if (b.type === "heading") {
      section = { kind: "section", title: b.text, body: [] };
      slides.push(section);
    } else if (b.type === "text") {
      if (!b.text.trim()) continue;
      (section ?? (n ? undefined : intro))?.body.push(b.text);
    } else if (b.type === "exercise") {
      n++;
      section = undefined;
      slides.push({ kind: "exercise", title: b.text, body: [], n, answer: b.answer, chart });
    }
  }
  return slides;
}

/** A name not drawn yet, so everyone gets a turn before anyone is asked twice. */
export function drawName(names: string[], drawn: Set<string>, random = Math.random): { name: string; drawn: Set<string> } | undefined {
  if (!names.length) return undefined;
  const left = names.filter((n) => !drawn.has(n));
  const pool = left.length ? left : names;
  const name = pool[Math.floor(random() * pool.length)];
  return { name, drawn: new Set(left.length ? [...drawn, name] : [name]) };
}
