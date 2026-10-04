"use client";

import clsx from "clsx";
import { ArrowRight, Coffee, CornerDownRight, MessagesSquare, Paperclip, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { timeToMin } from "@/lib/dates";
import { dutyLabel } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import type { LessonSlot, LessonStatus, TimeBlock } from "@/lib/types";
import { needsLog, StatusPill, useClock } from "./lesson";
import { SUBJECT_STYLE } from "./subject";
import { toast } from "./toast";

type Entry = { kind: "lesson"; slot: LessonSlot } | { kind: "block"; block: TimeBlock };

function Times({ start, end, strong }: { start: string; end: string; strong?: boolean }) {
  return (
    <div className={clsx("w-11 shrink-0 pt-2.5 text-[12px] font-semibold leading-tight tabular-nums", strong ? "text-ink" : "text-muted")}>
      {start}
      <span className="block font-medium opacity-75">{end}</span>
    </div>
  );
}

function NowLine({ now }: { now: string }) {
  return (
    <div className="relative my-0.5 ml-[52px] border-t-2 border-now" aria-label={`Τώρα ${now}`}>
      <span className="absolute -left-[7px] -top-[6px] size-2.5 rounded-full bg-now" />
      <span className="absolute -left-[52px] -top-[9px] text-[11px] font-bold tabular-nums text-now">{now}</span>
    </div>
  );
}

function LogButtons({ slot }: { slot: LessonSlot }) {
  const updateSlot = useApp((s) => s.updateSlot);
  const set = (status: LessonStatus) => {
    updateSlot(slot.id, { status });
    toast(status === "done" ? "Καταγράφηκε: έγινε" : status === "partial" ? "Καταγράφηκε: μερικώς" : "Καταγράφηκε: δεν έγινε", {
      label: "Αναίρεση",
      run: () => updateSlot(slot.id, { status: "planned" }),
    });
  };
  const btn = "h-11 rounded-lg border border-line bg-bg text-[13px] font-semibold text-ink-2 transition-colors hover:bg-line-2";
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Πώς πήγε;">
      <button type="button" className={btn} onClick={() => set("done")}>Έγινε</button>
      <button type="button" className={btn} onClick={() => set("partial")}>Μερικώς</button>
      <button type="button" className={btn} onClick={() => set("skipped")}>Δεν έγινε</button>
    </div>
  );
}

function LessonItem({ slot, highlight, minutesTo }: { slot: LessonSlot; highlight: boolean; minutesTo?: number }) {
  const subject = useApp((s) => s.subjects.find((x) => x.id === slot.subjectId));
  const cls = useApp((s) => s.classes.find((x) => x.id === slot.classId));
  const students = useApp((s) => s.students);
  const clock = useClock();
  const st = SUBJECT_STYLE[slot.subjectId];
  const pending = needsLog(slot, clock);
  const count = students.filter((x) => x.classId === slot.classId).length;

  if (highlight)
    return (
      <div className={clsx("relative grid min-w-0 gap-2 rounded-2xl p-4", st.soft)}>
        <span className={clsx("absolute inset-y-3 left-0 w-1 rounded-r", st.bar)} aria-hidden />
        <span className="inline-flex w-fit items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">
          {minutesTo !== undefined && minutesTo > 0 ? `Σε ${minutesTo} λεπτά` : "Τώρα"}
          {cls?.room && ` · ${cls.room}`}
        </span>
        <p className="text-lg font-extrabold leading-tight">
          {subject?.name} · {cls?.name}
        </p>
        {slot.topic && (
          <p className="text-sm text-ink-2">
            {slot.carriedFromId && <CornerDownRight className="mr-1 inline size-3.5 text-amber" />}
            {slot.topic}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 text-[12px] font-semibold text-ink-2">
          {slot.materialIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
              <Paperclip className="size-3" /> {slot.materialIds.length} {slot.materialIds.length === 1 ? "αρχείο" : "αρχεία"}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
            <Users className="size-3" /> {count} {count === 1 ? "μαθητής" : "μαθητές"}
          </span>
        </div>
        <Link href={`/lessons/${slot.id}`} className="mt-1 inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
          Άνοιγμα μαθήματος <ArrowRight className="size-4" />
        </Link>
      </div>
    );

  return (
    <div className="relative grid min-w-0 gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
      <span className={clsx("absolute inset-y-2.5 left-0 w-1 rounded-r", st.bar)} aria-hidden />
      <Link href={`/lessons/${slot.id}`} className="group min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold leading-tight group-hover:underline">
          {subject?.name}
          <StatusPill slot={slot} />
        </p>
        <p className="truncate text-[13px] text-muted">
          {cls?.name}
          {slot.topic && ` · ${slot.topic}`}
        </p>
      </Link>
      {pending && <LogButtons slot={slot} />}
    </div>
  );
}

const BLOCK_ICON = { duty: ShieldCheck, free: Coffee, meeting: MessagesSquare };

function BlockItem({ block }: { block: TimeBlock }) {
  const country = useApp((s) => s.profile.country);
  const Icon = BLOCK_ICON[block.kind];
  const label = block.kind === "duty" ? dutyLabel(country) : block.kind === "free" ? "Κενό" : "Σύσκεψη";
  return (
    <div
      className={clsx(
        "flex min-w-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-[13px]",
        block.kind === "duty" && "bg-duty-50 font-semibold text-duty [background-image:repeating-linear-gradient(135deg,transparent_0_8px,color-mix(in_srgb,var(--color-duty)_8%,transparent)_8px_9px)]",
        block.kind === "free" && "border border-dashed border-line text-muted",
        block.kind === "meeting" && "bg-info-50 font-semibold text-info",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">
        {label}
        {block.label && ` · ${block.label}`}
        {block.kind === "free" && ` · ${timeToMin(block.end) - timeToMin(block.start)}′`}
      </span>
    </div>
  );
}

/** A day as a timeline: lessons, εφημερία/παιδονομία, κενά, and a "now" line on today. */
export function Timeline({ date, empty }: { date: string; empty?: ReactNode }) {
  const slots = useApp((s) => s.slots);
  const blocks = useApp((s) => s.blocks);
  const { today, now } = useClock();
  const entries: (Entry & { start: string; end: string })[] = [
    ...slots.filter((s) => s.date === date).map((slot) => ({ kind: "lesson" as const, slot, start: slot.start, end: slot.end })),
    ...blocks.filter((b) => b.date === date).map((block) => ({ kind: "block" as const, block, start: block.start, end: block.end })),
  ].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));

  if (!entries.length) return <>{empty}</>;

  const isToday = date === today;
  const nowMin = timeToMin(now);
  const nextLesson = isToday
    ? entries.find((e) => e.kind === "lesson" && timeToMin(e.end) > nowMin && !e.slot.carriedToId)
    : undefined;
  const nowIndex = isToday ? entries.findIndex((e) => timeToMin(e.start) > nowMin) : -1;
  const showNow = isToday && nowMin >= timeToMin(entries[0].start) - 60 && nowMin <= timeToMin(entries.at(-1)!.end);

  return (
    <div className="grid gap-2">
      {entries.map((e, i) => (
        <div key={e.kind === "lesson" ? e.slot.id : e.block.id} className="contents">
          {showNow && i === nowIndex && <NowLine now={now} />}
          <div className="flex gap-2">
            <Times start={e.start} end={e.end} strong={e === nextLesson} />
            <div className="min-w-0 flex-1">
              {e.kind === "lesson" ? (
                <LessonItem slot={e.slot} highlight={e === nextLesson} minutesTo={timeToMin(e.start) - nowMin} />
              ) : (
                <BlockItem block={e.block} />
              )}
            </div>
          </div>
        </div>
      ))}
      {showNow && nowIndex === -1 && <NowLine now={now} />}
    </div>
  );
}

/** Progress ring for "how many of today's finished lessons are logged". */
export function LogRing({ done, total }: { done: number; total: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
