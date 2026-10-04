"use client";

import clsx from "clsx";
import { ArrowRight, Check, ChevronRight, CircleDashed, CornerDownRight, Paperclip, Users, X } from "lucide-react";
import Link from "next/link";
import { DEMO_NOW, DEMO_TODAY, timeToMin } from "@/lib/dates";
import { useApp } from "@/lib/store";
import type { LessonSlot, LessonStatus } from "@/lib/types";
import { SUBJECT_STYLE } from "./subject";

export const STATUS_LABEL: Record<LessonStatus, string> = {
  planned: "Προγραμματισμένο",
  done: "Ολοκληρώθηκε",
  partial: "Μερικώς",
  skipped: "Δεν έγινε",
};

export function needsLog(s: LessonSlot): boolean {
  return s.status === "planned" && (s.date < DEMO_TODAY || (s.date === DEMO_TODAY && timeToMin(s.end) <= timeToMin(DEMO_NOW)));
}

export function isNow(s: LessonSlot): boolean {
  const now = timeToMin(DEMO_NOW);
  return s.date === DEMO_TODAY && timeToMin(s.start) - 20 <= now && now < timeToMin(s.end);
}

export function StatusPill({ slot }: { slot: LessonSlot }) {
  if (slot.carriedToId)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber">
        <ArrowRight className="size-3" /> Μεταφέρθηκε
      </span>
    );
  if (needsLog(slot))
    return <span className="inline-flex items-center gap-1 rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger">Καταγραφή;</span>;
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
  const subject = useApp((s) => s.subjects.find((x) => x.id === slot.subjectId));
  const cls = useApp((s) => s.classes.find((x) => x.id === slot.classId));
  const style = SUBJECT_STYLE[slot.subjectId];
  const live = isNow(slot);
  return (
    <Link
      href={`/lessons/${slot.id}`}
      className={clsx(
        "group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors sm:gap-4 sm:px-4",
        live ? "border-brand-100 bg-brand-50" : "border-line-2 bg-surface hover:border-line hover:bg-line-2/50",
      )}
    >
      <div className={clsx("w-12 shrink-0 text-[13px] leading-tight tabular-nums", live ? "font-bold text-ink" : "text-ink-2")}>
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
