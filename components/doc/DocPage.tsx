"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, BookOpen, GripVertical, Pencil, Trash2, Target } from "lucide-react";
import { useState } from "react";
import { buttonClass, cx, inputClass } from "../ui";
import { SUBJECTS } from "@/lib/seed";
import type { Block, Material } from "@/lib/types";

const BAR_COLORS = ["#ef8f9d", "#f6d36b", "#f4a259", "#5f9fdc", "#9b7fd6"];
const BAR_GRAYS = ["#4a4a4a", "#8a8a8a", "#c4c4c4", "#6a6a6a", "#a8a8a8"];

export function BarChart({ chart, bw }: { chart: NonNullable<Block["chart"]>; bw?: boolean }) {
  const max = Math.max(10, ...chart.bars.map((b) => b.value));
  const ticks = Array.from({ length: max / 2 + 1 }, (_, i) => i * 2);
  const W = 360;
  const H = 190;
  const left = 34;
  const bottom = 26;
  const plotH = H - bottom - 10;
  const slot = (W - left - 10) / chart.bars.length;
  return (
    <figure className="my-2 flex items-center gap-3">
      <figcaption className="w-16 shrink-0 text-[11px] font-medium leading-tight text-ink-2 sm:w-20 sm:text-xs">{chart.yLabel}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={`${chart.title}: ${chart.bars.map((b) => `${b.label} ${b.value}`).join(", ")}`}>
        {ticks.map((t) => {
          const y = 10 + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={left} x2={W - 10} y1={y} y2={y} stroke="#e8eae5" />
              <text x={left - 8} y={y + 4} fontSize="11" textAnchor="end" fill="#555">
                {t}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={left} y1={10} y2={10 + plotH} stroke="#333" />
        <line x1={left} x2={W - 10} y1={10 + plotH} y2={10 + plotH} stroke="#333" />
        {chart.bars.map((b, i) => {
          const h = (b.value / max) * plotH;
          const x = left + slot * i + slot * 0.22;
          const w = slot * 0.56;
          return (
            <g key={b.label}>
              <rect x={x} y={10 + plotH - h} width={w} height={h} fill={(bw ? BAR_GRAYS : BAR_COLORS)[i % 5]} rx="2" />
              <text x={x + w / 2} y={10 + plotH - h - 6} fontSize="13" fontWeight="700" textAnchor="middle" fill="#222">
                {b.value}
              </text>
              <text x={x + w / 2} y={H - 8} fontSize="12" textAnchor="middle" fill="#222">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function AnswerLines({ n }: { n: number }) {
  return <div aria-hidden className="ruled mt-1" style={{ height: n * 28 }} />;
}

export interface DocEditHandlers {
  selectedId?: string;
  onSelect: (id?: string) => void;
  onSave: (id: string, patch: Pick<Block, "text" | "answer">) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
}

function BlockEditor({ block, onCancel, onSave }: { block: Block; onCancel: () => void; onSave: (p: Pick<Block, "text" | "answer">) => void }) {
  const [text, setText] = useState(block.text);
  const [answer, setAnswer] = useState(block.answer ?? "");
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={Math.max(2, text.split("\n").length + 1)} aria-label="Κείμενο" className={cx(inputClass, "py-2 text-[15px]")} />
      {block.type === "exercise" && (
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Λύση (προαιρετικά)" aria-label="Λύση" className={cx(inputClass, "h-9")} />
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonClass("ghost", "sm")} onClick={onCancel}>
          Άκυρο
        </button>
        <button type="button" className={buttonClass("primary", "sm")} disabled={!text.trim()} onClick={() => onSave({ text: text.trim(), answer: answer.trim() || undefined })}>
          Αποθήκευση
        </button>
      </div>
    </div>
  );
}

export function DocPage({
  material,
  blocks,
  mode,
  highlight = [],
  edit,
  className,
}: {
  material: Material;
  blocks: Block[];
  mode: "edit" | "view" | "solutions";
  highlight?: string[];
  edit?: DocEditHandlers;
  className?: string;
}) {
  const [editingId, setEditingId] = useState<string>();
  const subject = SUBJECTS.find((x) => x.id === material.subjectId)?.name;
  const isSheet = material.kind === "worksheet" || material.kind === "quiz";
  let exNo = 0;

  return (
    <article className={clsx("mx-auto w-full max-w-[680px] bg-white px-5 py-6 text-ink shadow-paper sm:px-10 sm:py-9", className)}>
      <header className="flex items-center justify-between border-b-2 border-brand-100 pb-3">
        <span className="flex items-center gap-1.5 text-lg font-extrabold text-brand">
          <BookOpen className="size-5" strokeWidth={2.4} /> τάξη
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="text-ink-2">{subject}</span>
          <span className={clsx("rounded-md px-2 py-0.5 font-semibold", material.blackAndWhite ? "bg-line-2 text-ink" : "bg-info-50 text-info")}>{material.level === "basic" ? "Επίπεδο Α" : material.level === "advanced" ? "Επίπεδο Γ" : "Επίπεδο Β"}</span>
        </span>
      </header>
      {mode === "solutions" && <p className="mt-3 rounded-md bg-amber-50 px-3 py-1.5 text-center text-xs font-bold tracking-wide text-amber">ΦΥΛΛΟ ΛΥΣΕΩΝ</p>}

      <div className="mt-4 space-y-1">
        {blocks.map((b, i) => {
          if (b.type === "exercise") exNo++;
          const n = exNo;
          const selected = edit?.selectedId === b.id;
          const editing = editingId === b.id;
          const hl = highlight.includes(b.id);
          const interactive = mode === "edit" && edit;

          const body = (() => {
            if (editing && edit)
              return (
                <BlockEditor
                  block={b}
                  onCancel={() => setEditingId(undefined)}
                  onSave={(p) => {
                    edit.onSave(b.id, p);
                    setEditingId(undefined);
                  }}
                />
              );
            switch (b.type) {
              case "heading":
                return <h2 className="py-2 text-center text-xl font-extrabold leading-snug sm:text-2xl">{b.text}</h2>;
              case "text":
                return <p className="whitespace-pre-line text-[14px] leading-relaxed sm:text-[15px]">{b.text}</p>;
              case "chart":
                return b.chart ? <BarChart chart={b.chart} bw={material.blackAndWhite} /> : null;
              case "exercise":
                return (
                  <div>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed sm:text-[15px]">
                      <span className="mr-1.5 font-bold">{n}.</span>
                      {b.text}
                    </p>
                    {mode === "solutions" ? (
                      <p className="mt-1 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">{b.answer ?? "Ελεύθερη απάντηση"}</p>
                    ) : (
                      <AnswerLines n={b.lines ?? 2} />
                    )}
                  </div>
                );
            }
          })();

          return (
            <div key={b.id}>
              {i === 1 && isSheet && blocks[0]?.type === "heading" && (
                <div className="mb-3 flex gap-6 text-sm text-ink-2">
                  <span className="flex flex-1 items-end gap-2">
                    Όνομα: <span className="mb-1 flex-1 border-b border-ink/40" />
                  </span>
                  <span className="flex w-2/5 items-end gap-2">
                    Ημερομηνία: <span className="mb-1 flex-1 border-b border-ink/40" />
                  </span>
                </div>
              )}
              <div
                onClick={interactive && !editing ? () => edit.onSelect(selected ? undefined : b.id) : undefined}
                className={clsx(
                  "group relative rounded-lg px-2 py-1.5 transition-colors sm:-mx-3 sm:px-3",
                  interactive && !editing && "cursor-pointer hover:bg-line-2/50",
                  selected && "bg-brand-50/50 ring-2 ring-brand-100",
                  hl && "bg-amber-50 ring-2 ring-amber-100",
                )}
              >
                {interactive && selected && !editing && (
                  <div className="no-print absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-pop" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-line-2" onClick={() => setEditingId(b.id)}>
                      <Pencil className="size-3.5" /> Επεξεργασία
                    </button>
                    <button type="button" aria-label="Μετακίνηση πάνω" className="flex size-7 items-center justify-center rounded-md hover:bg-line-2 disabled:opacity-30" disabled={i === 0} onClick={() => edit.onMove(b.id, -1)}>
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Μετακίνηση κάτω" className="flex size-7 items-center justify-center rounded-md hover:bg-line-2 disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => edit.onMove(b.id, 1)}>
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Διαγραφή" className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-50" onClick={() => edit.onDelete(b.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
                {interactive && b.type === "exercise" && !editing && (
                  <span className="no-print absolute -left-5 top-2 hidden text-muted opacity-0 group-hover:opacity-100 sm:block">
                    {selected ? <Target className="size-4 text-brand" /> : <GripVertical className="size-4" />}
                  </span>
                )}
                {body}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
