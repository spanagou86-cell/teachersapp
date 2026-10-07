"use client";

import { ShieldCheck } from "@/components/icons";
import { useState } from "react";
import { create } from "zustand";
import { addDays, shortDate, timeToMin } from "@/lib/dates";
import { dutyLabel, isSchoolDay } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { BELLS, isValidTime } from "@/lib/timetable";
import { toast } from "./toast";
import { Button, cx, Field, inputClass, Sheet } from "./ui";

export const DUTY_PLACES = ["Αυλή", "Είσοδος", "Διάδρομος", "Κλίμακα", "Κυλικείο"];

export const useDutySheet = create<{ open: boolean; date?: string; set: (open: boolean, date?: string) => void }>((set) => ({
  open: false,
  set: (open, date) => set({ open, date }),
}));
/** «Παιδονομία μία φορά»: a swap or a replacement on one day, with the same 5′ reminder. */
export const openDutySheet = (date?: string) => useDutySheet.getState().set(true, date);

function Body({ onClose, initialDate }: { onClose: () => void; initialDate?: string }) {
  const country = useApp((s) => s.profile.country);
  const today = useApp((s) => s.today);
  const addBlock = useApp((s) => s.addBlock);
  const removeBlock = useApp((s) => s.removeBlock);
  const duty = dutyLabel(country);
  // The next school day after today, unless a day was given.
  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate;
    let d = addDays(today, 1);
    for (let i = 0; i < 14 && !isSchoolDay(country, d); i++) d = addDays(d, 1);
    return d;
  });
  // The morning duty: the quarter before the first bell.
  const bell = timeToMin(BELLS[country][0].start);
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const morning = { start: hhmm(bell - 15), end: hhmm(bell) };
  const firstBreak = BELLS[country].find((p) => timeToMin(p.end) - timeToMin(p.start) < 30) ?? BELLS[country][0];
  const [start, setStart] = useState(firstBreak.start);
  const [end, setEnd] = useState(firstBreak.end);
  const [place, setPlace] = useState("");
  const valid = Boolean(date) && isValidTime(start) && isValidTime(end) && timeToMin(end) > timeToMin(start);

  const save = () => {
    if (!valid) return;
    const id = addBlock({ date, start, end, kind: "duty", label: place.trim().slice(0, 80) });
    onClose();
    toast(`${duty} ${shortDate(date)} ${start} · θα σε ειδοποιήσω 5′ πριν`, { label: "Αναίρεση", run: () => removeBlock(id) });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${duty} μία φορά`}
      footer={
        <div className="pb-3">
          <Button className="h-11 w-full" onClick={save} disabled={!valid}>
            <ShieldCheck className="size-4" /> Προσθήκη
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <p className="text-sm text-muted">Για μία μόνο μέρα, π.χ. αντικατάσταση συναδέλφου. Δεν αλλάζει το εβδομαδιαίο σου πρόγραμμα.</p>

        <Field label="Ημερομηνία">
          <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className={cx(inputClass, "h-11")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Από">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={cx(inputClass, "h-11")} />
          </Field>
          <Field label="Έως">
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={cx(inputClass, "h-11", !valid && isValidTime(end) && "border-danger")}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Διαλείμματα">
          {[morning, ...BELLS[country].filter((p) => timeToMin(p.end) - timeToMin(p.start) < 30)].map((p) => (
            <button
              key={p.start}
              type="button"
              aria-pressed={start === p.start && end === p.end}
              onClick={() => (setStart(p.start), setEnd(p.end))}
              className={cx(
                "h-9 rounded-full border px-3 text-[13px] font-semibold tabular-nums",
                start === p.start && end === p.end ? "border-amber bg-amber-50 text-amber" : "border-line bg-surface text-ink-2",
              )}
            >
              {p === morning ? "Πρωινή " : ""}
              {p.start}–{p.end}
            </button>
          ))}
        </div>
        <Field label="Σημείο (προαιρετικό)">
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            list="duty-places"
            maxLength={80}
            placeholder="π.χ. Αυλή"
            className={cx(inputClass, "h-11")}
          />
          <datalist id="duty-places">
            {DUTY_PLACES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
      </div>
    </Sheet>
  );
}

export function DutySheet() {
  const open = useDutySheet((s) => s.open);
  const date = useDutySheet((s) => s.date);
  const set = useDutySheet((s) => s.set);
  if (!open) return null;
  return <Body key={date ?? ""} initialDate={date} onClose={() => set(false)} />;
}
