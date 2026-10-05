"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "@/components/icons";
import { CY_SCHOOLS } from "@/lib/schools/cy";
import { cx, inputClass, Sheet } from "./ui";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[«»"'΄’()–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const INDEX = CY_SCHOOLS.map((s) => ({ ...s, key: fold(`${s.name} ${s.district}`) }));
const SHOWN = 60;

/**
 * Cyprus: pick the school from the Ministry's list (search as you type, any word, no accents
 * needed). A private or unlisted school can still be typed and kept as written.
 */
export function SchoolPicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const words = fold(q).replace(/^δημοτικ\S*( σχολει\S*)?/, "").split(" ").filter(Boolean);
    if (!words.length) return INDEX;
    return INDEX.filter((s) => words.every((w) => s.key.includes(w)));
  }, [q]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };
  const typed = q.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Το σχολείο σου"
        aria-haspopup="dialog"
        className={cx(inputClass, "flex h-11 items-center gap-2 text-left", className)}
      >
        <span className={cx("min-w-0 flex-1 truncate", !value && "text-muted/70")}>{value || "Διάλεξε το σχολείο σου"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>
      {/* Inside a <label>, a click in the sheet would re-open it through the label: stop that. */}
      <div onClick={(e) => e.preventDefault()}>
      <Sheet open={open} onClose={() => setOpen(false)} title="Το σχολείο σου">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length === 1) pick(results[0].name);
            }}
            aria-label="Αναζήτηση σχολείου"
            placeholder="π.χ. Λατσιών, Λεμεσού ΙΒ΄, Πάφου"
            maxLength={120}
            className={cx(inputClass, "h-11 pl-10")}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {results.length === INDEX.length ? `${INDEX.length} δημόσια δημοτικά σχολεία Κύπρου` : `${results.length} ${results.length === 1 ? "σχολείο" : "σχολεία"}`}
        </p>
        <ul className="mt-2 divide-y divide-line-2" role="listbox" aria-label="Σχολεία">
          {results.slice(0, SHOWN).map((s) => (
            <li key={s.name + s.district}>
              <button
                type="button"
                role="option"
                aria-selected={s.name === value}
                onClick={() => pick(s.name)}
                className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-line-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{s.name}</span>
                  <span className="block text-xs text-muted">{s.district}</span>
                </span>
                {s.name === value && <Check className="size-4 shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
        {results.length > SHOWN && <p className="py-2 text-center text-xs text-muted">Γράψε λίγο ακόμη για να δεις τα υπόλοιπα.</p>}
        {typed.length > 2 && (
          <button type="button" onClick={() => pick(typed)} className="mt-2 w-full rounded-lg border border-dashed border-line px-3 py-2.5 text-left text-sm text-ink-2 hover:bg-line-2">
            Δεν είναι στη λίστα (π.χ. ιδιωτικό); Κράτησε «<b className="text-ink">{typed}</b>»
          </button>
        )}
      </Sheet>
      </div>
    </>
  );
}
