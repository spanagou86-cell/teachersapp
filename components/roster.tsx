"use client";

import { ArrowLeftRight, Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { aiReadRoster, type RosterName } from "@/lib/ai/client";
import { useApp } from "@/lib/store";
import { toast } from "./toast";
import { Button, cx, inputClass } from "./ui";

/**
 * «Φωτογραφία λίστας»: the teacher photographs the class list (myschool printout, board,
 * handwritten page), checks the names that were read, and adds them in one tap.
 */
export function RosterImport({ className, onAdd }: { className?: string; onAdd: (list: RosterName[]) => void }) {
  const mode = useApp((s) => s.mode);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<RosterName[] | null>(null);
  const [notes, setNotes] = useState("");

  const read = async (file: File) => {
    setBusy(true);
    const r = await aiReadRoster(file, className ?? "");
    setBusy(false);
    if (!r.ok) return toast(r.error);
    setList(r.data.students);
    setNotes(r.data.notes?.trim() ?? "");
  };

  const patch = (i: number, p: Partial<RosterName>) => setList((l) => l && l.map((x, j) => (j === i ? { ...x, ...p } : x)));

  if (list)
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-3">
        <p className="mb-2 text-[14px] font-bold">
          Βρήκα {list.length} {list.length === 1 ? "μαθητή" : "μαθητές"}. Έλεγξε τα ονόματα:
        </p>
        {notes && <p className="mb-2 text-[13px] text-amber">{notes}</p>}
        <ul className="grid gap-1.5">
          {list.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <input value={s.firstName} onChange={(e) => patch(i, { firstName: e.target.value })} aria-label={`Όνομα ${i + 1}`} placeholder="Όνομα" maxLength={60} className={cx(inputClass, "h-10 flex-1")} />
              <input value={s.lastName} onChange={(e) => patch(i, { lastName: e.target.value })} aria-label={`Επώνυμο ${i + 1}`} placeholder="Επώνυμο" maxLength={60} className={cx(inputClass, "h-10 flex-1")} />
              <button
                type="button"
                aria-label="Αντιμετάθεση ονόματος και επωνύμου"
                onClick={() => patch(i, { firstName: s.lastName, lastName: s.firstName })}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface"
              >
                <ArrowLeftRight className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Αφαίρεση ${s.firstName}`}
                onClick={() => setList((l) => l && l.filter((_, j) => j !== i))}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={() => setList(null)}>
            Άκυρο
          </Button>
          <Button
            className="flex-1"
            disabled={!list.some((s) => s.firstName.trim())}
            onClick={() => {
              const clean = list.filter((s) => s.firstName.trim());
              onAdd(clean);
              setList(null);
              toast(`Προστέθηκαν ${clean.length} μαθητές`);
            }}
          >
            Προσθήκη {list.filter((s) => s.firstName.trim()).length} μαθητών
          </Button>
        </div>
      </div>
    );

  return (
    <>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => (mode === "cloud" ? input.current?.click() : toast("Η ανάγνωση από φωτογραφία είναι διαθέσιμη με λογαριασμό."))}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {busy ? "Διαβάζω τα ονόματα…" : "Φωτογραφία της λίστας μαθητών"}
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void read(f);
        }}
      />
    </>
  );
}
