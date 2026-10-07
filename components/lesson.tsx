"use client";

import clsx from "clsx";
import { ArrowRight, Check, ChevronRight, CircleDashed, Coffee, CornerDownRight, MessagesSquare, Paperclip, ShieldCheck, Users, X } from "@/components/icons";
import type { ReactNode } from "react";
import Link from "next/link";
import { timeToMin } from "@/lib/dates";
import { dutyLabel } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { LessonSlot, LessonStatus, TimeBlock } from "@/lib/types";
import { SUBJECT_STYLE } from "./subject";

export const STATUS_LABEL: Record<LessonStatus, string> = {
  planned: "Προγραμματισμένο",
  done: "Ολοκληρώθηκε",
  partial: "Μερικώς",
  skipped: "Δεν έγινε",
};

export interface Clock {
  today: string;
  now: string;
}

export function useClock(): Clock {
  const today = useApp((s) => s.today);
  const now = useApp((s) => s.now);
  return { today, now };
}

export function needsLog(s: LessonSlot, { today, now }: Clock): boolean {
  return s.status === "planned" && (s.date < today || (s.date === today && timeToMin(s.end) <= timeToMin(now)));
}

export function isNow(s: LessonSlot, { today, now: hhmm }: Clock): boolean {
  const now = timeToMin(hhmm);
  return s.date === today && timeToMin(s.start) - 20 <= now && now < timeToMin(s.end);
}

export function StatusPill({ slot }: { slot: LessonSlot }) {
  const clock = useClock();
  if (slot.carriedToId)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber">
        <ArrowRight className="size-3" /> Μεταφέρθηκε
      </span>
    );
  if (needsLog(slot, clock))
    return <span className="inline-flex items-center gap-1 rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger">Πώς πήγε;</span>;
  const map: Record<LessonStatus, { cls: string; Icon: typeof Check } | null> = {
    planned: null,
    done: { cls: "bg-brand-50 text-brand", Icon: Check },
    partial: { cls: "bg-amber-50 text-amber", Icon: CircleDashed },
    skipped: { cls: "bg-line-2 text-muted", Icon: X },
  };
  const m = map[slot.status];
  if (!m) return null;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", m.cls)}>
      <m.Icon className="size-3" strokeWidth={3} /> {STATUS_LABEL[slot.status]}
    </span>
  );
}

export function LessonRow({ slot, compact }: { slot: LessonSlot; compact?: boolean }) {
  const subject = useSubjects().find((x) => x.id === slot.subjectId);
  const cls = useApp((s) => s.classes.find((x) => x.id === slot.classId));
  const style = SUBJECT_STYLE[slot.subjectId];
  const live = isNow(slot, useClock());
  return (
    <Link
      href={`/lessons/${slot.id}`}
      className={clsx(
        "group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors sm:gap-4 sm:px-4",
        live ? "border-brand-100 bg-brand-50" : "border-line-2 bg-surface hover:border-line hover:bg-line-2/50",
      )}
    >
      <div className={clsx("w-12 shrink-0 text-[12px] leading-tight tabular-nums", live ? "font-semibold text-ink" : "text-ink-2")}>
        {slot.start}
        <span className="block text-muted">– {slot.end}</span>
      </div>
      <span className={clsx("w-1 self-stretch rounded-full", style.bar)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold">{subject?.name}</span>
          <StatusPill slot={slot} />
        </div>
        <p className="truncate text-sm text-muted">
          {slot.carriedFromId && <CornerDownRight className="mr-1 inline size-3.5 text-amber" aria-label="Συνέχεια" />}
          {slot.topic}
          {compact && cls && <span className="lg:hidden"> · {cls.name}</span>}
        </p>
      </div>
      <div className={clsx("hidden items-center gap-2 sm:flex", compact && "lg:flex")}>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink-2">
          <Users className="size-3.5" /> {cls?.name}
        </span>
        {slot.materialIds.length > 0 && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink-2">
            <Paperclip className="size-3.5" /> {slot.materialIds.length} {slot.materialIds.length === 1 ? "αρχείο" : "αρχεία"}
          </span>
        )}
      </div>
      {slot.materialIds.length > 0 && (
        <span className={clsx("inline-flex items-center gap-0.5 text-xs font-semibold text-muted sm:hidden", compact && "lg:hidden")}>
          <Paperclip className="size-3.5" />
          {slot.materialIds.length}
        </span>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

const BLOCK_STYLE: Record<TimeBlock["kind"], { cls: string; Icon: typeof Check; label: string }> = {
  duty: { cls: "border-amber-100 bg-amber-50 text-ink", Icon: ShieldCheck, label: "Παιδονομία" },
  free: { cls: "border-dashed border-line bg-transparent text-muted", Icon: Coffee, label: "Κενό" },
  meeting: { cls: "border-info-50 bg-info-50 text-ink", Icon: MessagesSquare, label: "Σύσκεψη" },
};

export function BlockRow({ block }: { block: TimeBlock }) {
  const country = useApp((s) => s.profile.country);
  const st = BLOCK_STYLE[block.kind];
  return (
    <div className={clsx("flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:gap-4 sm:px-4", st.cls)}>
      <div className="w-12 shrink-0 text-[12px] leading-tight tabular-nums text-ink-2">
        {block.start}
        <span className="block text-muted">– {block.end}</span>
      </div>
      <st.Icon className={clsx("size-5 shrink-0", block.kind === "duty" ? "text-amber" : block.kind === "meeting" ? "text-info" : "text-muted")} />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{block.kind === "duty" ? dutyLabel(country) : st.label}</span>
        {block.label && <span className="text-muted"> · {block.label}</span>}
      </p>
    </div>
  );
}

/** A day's lessons together with παιδονομίες, κενά and συσκέψεις, in time order. */
export function DayList({ date, compact, empty }: { date: string; compact?: boolean; empty?: ReactNode }) {
  const slots = useApp((s) => s.slots);
  const blocks = useApp((s) => s.blocks);
  const items = [
    ...slots.filter((s) => s.date === date).map((s) => ({ key: s.id, start: s.start, node: <LessonRow key={s.id} slot={s} compact={compact} /> })),
    ...blocks.filter((b) => b.date === date).map((b) => ({ key: b.id, start: b.start, node: <BlockRow key={b.id} block={b} /> })),
  ].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  if (!items.length) return <>{empty}</>;
  return <div className="space-y-2">{items.map((i) => i.node)}</div>;
}
