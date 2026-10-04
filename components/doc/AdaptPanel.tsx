"use client";

import clsx from "clsx";
import { Columns2, Contrast, FileText, Lightbulb, Maximize2, Sparkles, TrendingDown, TrendingUp, X, Info, Loader2, FlaskConical } from "lucide-react";
import { useState } from "react";
import { adaptMaterial, QUICK_ACTIONS, type AdaptResult, type QuickAction } from "@/lib/ai/mock";
import { exerciseNumber } from "@/lib/materials";
import type { Block, Material } from "@/lib/types";
import { Button, Card, cx, inputClass, Select } from "../ui";
import { FileBadge } from "../subject";
import { formatBytes } from "@/lib/materials";

const ICONS: Record<QuickAction, typeof FileText> = {
  simpler: TrendingDown,
  harder: TrendingUp,
  versionAB: Columns2,
  solutions: Lightbulb,
  space: Maximize2,
  bw: Contrast,
};

export interface Suggestion extends AdaptResult {
  before: Block[];
}

export function AdaptPanel({
  material,
  selectedId,
  onSelect,
  suggestion,
  onSuggest,
  onApply,
  onDiscard,
}: {
  material: Material;
  selectedId?: string;
  onSelect: (id?: string) => void;
  suggestion?: Suggestion;
  onSuggest: (s: Suggestion) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const exercises = material.blocks.filter((b) => b.type === "exercise");

  const toggle = (a: QuickAction) =>
    setActions((xs) => {
      const without = xs.filter((x) => x !== a);
      if (xs.includes(a)) return without;
      // "Simpler" and "harder" pull in opposite directions; keep the latest.
      const opposite = a === "simpler" ? "harder" : a === "harder" ? "simpler" : undefined;
      return [...without.filter((x) => x !== opposite), a];
    });

  const generate = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const result = adaptMaterial({ blocks: material.blocks, actions, prompt, targetId: selectedId });
    setBusy(false);
    onSuggest({ ...result, before: material.blocks });
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-brand-50 text-brand">
          <Sparkles className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-tight">Προσάρμοσε το υλικό</h2>
          <p className="text-sm text-muted">Με βάση το αρχείο σου</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-line-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted" title="Η σύνδεση με μοντέλο AI δεν έχει γίνει ακόμη· οι προτάσεις είναι δείγμα.">
          <FlaskConical className="size-3" /> Δείγμα AI
        </span>
      </div>

      {material.file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-2.5">
          <FileBadge file={material.file} className="size-9" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-semibold">{material.file.name}</span>
            <span className="text-xs text-muted">{formatBytes(material.file.size)}</span>
          </span>
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Στόχος</span>
        <Select value={selectedId ?? ""} onChange={(e) => onSelect(e.target.value || undefined)}>
          <option value="">Όλο το φύλλο</option>
          {exercises.map((b) => (
            <option key={b.id} value={b.id}>
              Άσκηση {exerciseNumber(material.blocks, b.id)}
            </option>
          ))}
        </Select>
      </label>

      <p className="mb-2 mt-4 text-[15px] font-bold">Τι θέλεις να αλλάξεις;</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ id, label }) => {
          const Icon = ICONS[id];
          const on = actions.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={clsx(
                "flex h-11 items-center gap-2 rounded-xl border px-3 text-left text-[13px] font-medium transition-colors",
                on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line hover:bg-line-2",
              )}
            >
              <Icon className="size-4 shrink-0" /> {label}
            </button>
          );
        })}
      </div>
      <div className="relative mt-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="π.χ. Άλλαξε μόνο τη δεύτερη άσκηση, πιο απλά."
          aria-label="Οδηγία"
          className={cx(inputClass, "resize-none pb-6 pt-2.5")}
        />
        <span className="absolute bottom-2 right-3 text-[11px] text-muted">{prompt.length}/500</span>
      </div>
      <Button className="mt-3 w-full" onClick={generate} disabled={busy || (!actions.length && !prompt.trim())}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy ? "Δημιουργία…" : "Δημιουργία πρότασης"}
      </Button>

      {suggestion && (
        <div className="mt-4 animate-slide-up rounded-xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="flex-1">
              <p className="font-bold">{suggestion.changedIds.length || suggestion.versionB || suggestion.withSolutions || suggestion.blackAndWhite ? "Η πρόταση είναι έτοιμη" : "Καμία αλλαγή"}</p>
              <p className="mt-0.5 text-sm text-ink-2">{suggestion.summary}</p>
            </div>
            <button type="button" aria-label="Απόρριψη" onClick={onDiscard} className="text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          {suggestion.changedIds.length > 0 && (
            <ul className="mt-3 space-y-2">
              {suggestion.changedIds.map((id) => {
                const before = suggestion.before.find((b) => b.id === id);
                const after = suggestion.blocks.find((b) => b.id === id);
                return (
                  <li key={id} className="rounded-lg bg-surface p-2.5 text-xs">
                    <p className="font-semibold text-muted">Άσκηση {exerciseNumber(suggestion.blocks, id)}</p>
                    {before?.text !== after?.text && <p className="mt-1 text-muted line-through decoration-danger/50">{before?.text}</p>}
                    <p className="mt-1 text-ink">{after?.text}</p>
                    {before?.lines !== after?.lines && <p className="mt-1 text-brand-500">Χώρος απάντησης: {before?.lines ?? 2} → {after?.lines} γραμμές</p>}
                  </li>
                );
              })}
            </ul>
          )}
          {suggestion.partial && (
            <p className="mt-2 flex gap-1.5 text-xs text-amber">
              <Info className="mt-px size-3.5 shrink-0" /> Το δείγμα AI καταλαβαίνει βασικές οδηγίες (απλό, δύσκολο, λύσεις, χώρος, άσκηση Ν). Με το πραγματικό μοντέλο θα εφαρμόζεται όλη η οδηγία.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={onApply}>Εφαρμογή</Button>
            <Button variant="secondary" onClick={onDiscard}>
              Απόρριψη
            </Button>
          </div>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Info className="size-3.5" /> Το πρωτότυπο παραμένει ασφαλές· κάθε αλλαγή μπαίνει στο ιστορικό.
      </p>
    </Card>
  );
}
