"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, CornerDownRight, Paperclip } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LessonRow, StatusPill } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { SUBJECT_STYLE } from "@/components/subject";
import { Button, Card, IconButton } from "@/components/ui";
import { addDays, dayMonth, dayName, dayOfMonth, dayShort, DEMO_TODAY, shortDate, startOfWeek, weekDates } from "@/lib/dates";
import { slotsOn } from "@/lib/schedule";
import { useApp } from "@/lib/store";

export default function SchedulePage() {
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const classes = useApp((s) => s.classes);
  const [monday, setMonday] = useState(startOfWeek(DEMO_TODAY));
  const [day, setDay] = useState(DEMO_TODAY);
  const dates = weekDates(monday);
  const isThisWeek = monday === startOfWeek(DEMO_TODAY);
  const moveWeek = (n: number) => {
    const m = addDays(monday, n * 7);
    setMonday(m);
    setDay(n === 0 ? DEMO_TODAY : m);
  };

  const weekSlots = slots.filter((s) => s.date >= dates[0] && s.date <= dates[4]);
  const done = weekSlots.filter((s) => s.status === "done").length;

  return (
    <div>
      <PageHeader
        title="Πρόγραμμα"
        subtitle={`${shortDate(dates[0])} – ${shortDate(dates[4])} · ${weekSlots.length} μαθήματα${done ? ` · ${done} ολοκληρώθηκαν` : ""}`}
        actions={
          <div className="flex items-center gap-1">
            <IconButton label="Προηγούμενη εβδομάδα" onClick={() => moveWeek(-1)} className="border border-line bg-surface">
              <ChevronLeft className="size-5" />
            </IconButton>
            <Button variant="secondary" size="md" onClick={() => moveWeek(0)} disabled={isThisWeek} className="h-9">
              Σήμερα
            </Button>
            <IconButton label="Επόμενη εβδομάδα" onClick={() => moveWeek(1)} className="border border-line bg-surface">
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
        }
      />

      {/* Mobile: one day at a time */}
      <div className="lg:hidden">
        <div className="mb-4 grid grid-cols-5 gap-1.5">
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              aria-pressed={d === day}
              className={clsx(
                "flex h-14 flex-col items-center justify-center rounded-xl border text-[11px] font-semibold",
                d === day ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted",
              )}
            >
              {dayShort(d)}
              <span className={clsx("text-lg font-bold leading-tight", d === day ? "text-white" : "text-ink")}>{dayOfMonth(d)}</span>
            </button>
          ))}
        </div>
        <h2 className="mb-2 font-bold">
          {dayName(day)}, {dayMonth(day)}
        </h2>
        <div className="space-y-2">
          {slotsOn(slots, day).map((s) => (
            <LessonRow key={s.id} slot={s} compact />
          ))}
          {slotsOn(slots, day).length === 0 && <p className="py-8 text-center text-sm text-muted">Δεν υπάρχουν μαθήματα.</p>}
        </div>
      </div>

      {/* Desktop: week grid */}
      <Card className="hidden overflow-hidden lg:block">
        <div className="grid grid-cols-5 divide-x divide-line-2">
          {dates.map((d) => {
            const today = d === DEMO_TODAY;
            return (
              <div key={d} className={clsx("min-h-[460px]", today && "bg-brand-50/50")}>
                <div className="flex items-baseline gap-2 border-b border-line-2 px-3 py-3">
                  <span className={clsx("text-xs font-bold tracking-wide", today ? "text-brand" : "text-muted")}>{dayShort(d)}</span>
                  <span className={clsx("text-xl font-extrabold", today ? "text-brand" : "text-ink")}>{dayOfMonth(d)}</span>
                  {today && <span className="ml-auto rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">ΣΗΜΕΡΑ</span>}
                </div>
                <div className="space-y-2 p-2">
                  {slotsOn(slots, d).map((s) => {
                    const st = SUBJECT_STYLE[s.subjectId];
                    return (
                      <Link
                        key={s.id}
                        href={`/lessons/${s.id}`}
                        className={clsx(
                          "block rounded-xl border border-line-2 bg-surface p-2.5 transition hover:-translate-y-px hover:shadow-pop",
                          s.carriedToId && "opacity-60",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={clsx("h-4 w-1 rounded-full", st.bar)} />
                          <span className="text-xs font-semibold tabular-nums text-muted">
                            {s.start}–{s.end}
                          </span>
                          <span className="ml-auto rounded bg-line-2 px-1.5 text-[11px] font-bold text-ink-2">{classes.find((c) => c.id === s.classId)?.name}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-bold leading-snug">{subjects.find((x) => x.id === s.subjectId)?.name}</p>
                        <p className="line-clamp-2 text-xs text-muted">
                          {s.carriedFromId && <CornerDownRight className="mr-0.5 inline size-3 text-amber" />}
                          {s.topic}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusPill slot={s} />
                          {s.materialIds.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted">
                              <Paperclip className="size-3" /> {s.materialIds.length}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">Πάτησε ένα μάθημα για να καταγράψεις τι διδάχθηκε, να συνδέσεις υλικό ή να το μεταφέρεις.</p>
    </div>
  );
}
