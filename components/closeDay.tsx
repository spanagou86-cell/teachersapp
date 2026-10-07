"use client";

import { Check, UserCheck } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { create } from "zustand";
import { timeToMin } from "@/lib/dates";
import { slotsOn } from "@/lib/schedule";
import { attendanceFor, useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { LessonStatus } from "@/lib/types";
import { useClock } from "./lesson";
import { SubjectIcon } from "./subject";
import { toast } from "./toast";
import { Button, cx, Sheet } from "./ui";

export const useCloseDay = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));
export const openCloseDay = () => useCloseDay.getState().set(true);

const CHOICES: { value: LessonStatus; label: string }[] = [
  { value: "done", label: "Έγινε" },
  { value: "partial", label: "Μερικώς" },
  { value: "skipped", label: "Δεν έγινε" },
];

/** «Κλείσε τη μέρα»: every lesson of today in one screen — how it went, two words, missing attendance. */
function Body({ onClose }: { onClose: () => void }) {
  const clock = useClock();
  const slots = useApp((s) => s.slots);
  const classes = useApp((s) => s.classes);
  const state = useApp();
  const updateSlot = useApp((s) => s.updateSlot);
  const bumpTopics = useApp((s) => s.bumpTopics);
  const subjects = useSubjects();
  // Fixed when the sheet opens, so a lesson doesn't vanish once it's marked.
  const [ids] = useState(() => slotsOn(slots, clock.today).filter((s) => timeToMin(s.start) <= timeToMin(clock.now) && !s.carriedToId).map((s) => s.id));
  const lessons = ids.map((id) => slots.find((s) => s.id === id)).filter((s) => s !== undefined);
  const [moveOn, setMoveOn] = useState<Record<string, boolean>>({});
  const noAttendance = [...new Set(lessons.map((s) => s.classId))].filter((c) => !attendanceFor(state, c, clock.today));

  const finish = () => {
    let moved = 0;
    for (const s of lessons) if (s.status === "skipped" && moveOn[s.id] !== false && s.topic.trim() && bumpTopics(s.id)) moved++;
    onClose();
    toast(moved ? `Η μέρα έκλεισε · η ύλη προχώρησε σε ${moved} ${moved === 1 ? "μάθημα" : "μαθήματα"}` : "Η μέρα έκλεισε");
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Κλείσε τη μέρα"
      footer={
        <div className="pb-3">
          <Button className="w-full" onClick={finish} disabled={lessons.some((s) => s.status === "planned")}>
            <Check className="size-4" /> Τέλος για σήμερα
          </Button>
        </div>
      }
    >
      {lessons.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Δεν έχει γίνει κανένα μάθημα ακόμη σήμερα.</p>
      ) : (
        <ul className="grid gap-3">
          {lessons.map((s) => (
            <li key={s.id} className="grid gap-2 rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2.5">
                <SubjectIcon id={s.subjectId} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {s.start} · {subjects.find((x) => x.id === s.subjectId)?.name} · {classes.find((c) => c.id === s.classId)?.name}
                  </span>
                  {s.topic && <span className="block truncate text-xs text-muted">{s.topic}</span>}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Πώς πήγε: ${s.start}`}>
                {CHOICES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={s.status === c.value}
                    onClick={() => updateSlot(s.id, { status: s.status === c.value ? "planned" : c.value })}
                    className={cx(
                      "h-10 rounded-lg border text-[13px] font-semibold transition-colors",
                      s.status === c.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-bg text-ink-2 hover:bg-line-2",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {s.status !== "skipped" ? (
                <input
                  value={s.taughtNote}
                  onChange={(e) => updateSlot(s.id, { taughtNote: e.target.value.slice(0, 2000) })}
                  placeholder="Τι διδάχθηκε, σε δύο λέξεις"
                  aria-label={`Τι διδάχθηκε: ${s.start}`}
                  className="h-10 rounded-lg border border-line bg-bg px-3 text-base outline-none focus:border-brand-500 sm:text-sm"
                />
              ) : (
                s.topic.trim() && (
                  <label className="flex items-center gap-2 text-[13px] text-ink-2">
                    <input type="checkbox" checked={moveOn[s.id] !== false} onChange={(e) => setMoveOn((m) => ({ ...m, [s.id]: e.target.checked }))} className="size-4 accent-brand-500" />
                    Το θέμα πάει στο επόμενο μάθημα και η ύλη προχωρά
                  </label>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {noAttendance.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm">
          <UserCheck className="size-4 text-amber" />
          <span className="flex-1">Χωρίς παρουσίες σήμερα:</span>
          {noAttendance.map((c) => (
            <Link key={c} href={`/classes/${c}?date=${clock.today}`} onClick={onClose} className="rounded-md bg-surface px-2 py-1 font-semibold text-brand-700">
              {classes.find((x) => x.id === c)?.name}
            </Link>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function CloseDaySheet() {
  const open = useCloseDay((s) => s.open);
  const set = useCloseDay((s) => s.set);
  if (!open) return null;
  return <Body onClose={() => set(false)} />;
}
