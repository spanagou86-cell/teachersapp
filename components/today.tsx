"use client";

import clsx from "clsx";
import { ArrowRight, ArrowUp, CalendarClock, CheckCircle2, NotebookPen, Paperclip, Presentation, Sparkles, Timer } from "@/components/icons";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { openCloseDay } from "./closeDay";
import { needsLog, useClock } from "./lesson";
import { openPrepare } from "./prepare";
import { SUBJECT_STYLE, SubjectIcon } from "./subject";
import { addDays, dayName, longDate, shortDate, startOfWeek, timeToMin } from "@/lib/dates";
import { PREP, PREP_KINDS } from "@/lib/prepare";
import { slotsOn, upcomingLesson } from "@/lib/schedule";
import { holidayOn, termOn, weekNumber } from "@/lib/schoolYear";
import { vocative } from "@/lib/greek";
import { useReports } from "@/lib/store/reports";
import { hoursMinutes, minutesSavedThisWeek } from "@/lib/timeSaved";
import { toast } from "./toast";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { LessonSlot } from "@/lib/types";

/** Greek capitals carry no accents: «ΔΕΥΤΕΡΑ 5 ΟΚΤΩΒΡΙΟΥ». */
const caps = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} ώ ${String(n % 60).padStart(2, "0")}′` : `${n}′`);

/** Cards arrive one after the other, once, on load. */
export const rise = (i: number): { className: string; style: CSSProperties } => ({
  className: "animate-slide-up [animation-fill-mode:both]",
  style: { animationDelay: `${i * 60}ms` },
});

function useToday() {
  const slots = useApp((s) => s.slots);
  const clock = useClock();
  const lessons = slotsOn(slots, clock.today).filter((s) => !s.carriedToId);
  return { slots, clock, lessons, nowMin: timeToMin(clock.now) };
}

/** The day as a bar: one segment per lesson, filled as the day goes by. */
function DayProgress({ lessons, nowMin }: { lessons: LessonSlot[]; nowMin: number }) {
  if (!lessons.length) return null;
  const done = lessons.filter((s) => timeToMin(s.end) <= nowMin).length;
  const last = lessons.at(-1)!;
  return (
    <div className="grid gap-2">
      <div className="flex gap-1" role="img" aria-label={`${done} από ${lessons.length} μαθήματα`}>
        {lessons.map((s) => {
          const a = timeToMin(s.start);
          const b = timeToMin(s.end);
          const fill = nowMin >= b ? 100 : nowMin <= a ? 0 : Math.round(((nowMin - a) / (b - a)) * 100);
          return (
            <span key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <span className="block h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${fill}%` }} />
            </span>
          );
        })}
      </div>
      <p className="text-[13px] text-white/70 tabular-nums">
        {done === lessons.length ? "Τα μαθήματα τελείωσαν" : `${done} από ${lessons.length} μαθήματα`} · σχόλασμα {last.end}
      </p>
    </div>
  );
}

function NowShell({ label, live, children }: { label: string; live?: boolean; children: ReactNode }) {
  return (
    <div className="relative grid min-w-0 gap-3 rounded-2xl bg-surface p-4 text-ink shadow-[0_24px_48px_-24px_rgb(5_10_30/0.6)] sm:p-5">
      <span className="flex items-center gap-2 text-[11.5px] font-bold tracking-[0.12em] text-muted">
        {live && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-now/60" />
            <span className="relative inline-flex size-2 rounded-full bg-now" />
          </span>
        )}
        {label}
      </span>
      {children}
    </div>
  );
}

/** What matters this minute: the lesson running, the next one, closing the day, or the next school day. */
function NowCard() {
  const { slots, clock, lessons, nowMin } = useToday();
  const subjects = useSubjects();
  const classes = useApp((s) => s.classes);
  const timetable = useApp((s) => s.timetable);
  const country = useApp((s) => s.profile.country);
  const name = (s: LessonSlot) => subjects.find((x) => x.id === s.subjectId)?.name ?? "";
  const cls = (s: LessonSlot) => classes.find((x) => x.id === s.classId);

  const current = lessons.find((s) => timeToMin(s.start) <= nowMin && nowMin < timeToMin(s.end));
  const next = lessons.find((s) => timeToMin(s.start) > nowMin);
  const slot = current ?? next;

  if (slot) {
    const a = timeToMin(slot.start);
    const b = timeToMin(slot.end);
    const left = current ? b - nowMin : a - nowMin;
    const st = SUBJECT_STYLE[slot.subjectId];
    const c = cls(slot);
    const bare = !slot.materialIds.length;
    return (
      <NowShell label={current ? "ΤΩΡΑ" : "ΕΠΟΜΕΝΟ ΜΑΘΗΜΑ"} live={Boolean(current)}>
        <div className="flex items-start gap-3">
          <SubjectIcon id={slot.subjectId} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">
              {name(slot)} · {c?.name}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-ink-2">{slot.topic || "Χωρίς θέμα ακόμη"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{left > 90 && !current ? slot.start : mins(left)}</p>
            <p className="mt-1 text-[12px] font-medium text-muted">{current ? "μένουν" : left > 90 ? "ξεκινά" : "για να ξεκινήσει"}</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line-2" aria-hidden>
          <span
            className={clsx("block h-full rounded-full transition-[width] duration-700", st.bar)}
            style={{ width: `${current ? Math.round(((nowMin - a) / (b - a)) * 100) : 0}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-muted tabular-nums">
          <span>
            {slot.start}–{slot.end}
          </span>
          {c?.room && <span>{c.room}</span>}
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" />
            {bare ? "χωρίς υλικό" : `${slot.materialIds.length} ${slot.materialIds.length === 1 ? "αρχείο" : "αρχεία"}`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {current && !bare ? (
            // The lesson is on: put it on the class board.
            <Link
              href={`/board?lesson=${slot.id}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[14px] font-semibold transition-colors hover:bg-line-2"
            >
              <Presentation className="size-4" /> Στον πίνακα
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openPrepare({ slotId: slot.id })}
              className={clsx(
                "flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors",
                bare ? "bg-brand text-white hover:bg-brand-hover" : "border border-line bg-surface hover:bg-line-2",
              )}
            >
              <Sparkles className="size-4" /> {bare ? "Ετοίμασε" : "Κι άλλο υλικό"}
            </button>
          )}
          <Link
            href={`/lessons/${slot.id}`}
            className={clsx(
              "flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors",
              bare ? "border border-line bg-surface hover:bg-line-2" : "bg-brand text-white hover:bg-brand-hover",
            )}
          >
            Άνοιγμα <ArrowRight className="size-4" />
          </Link>
        </div>
      </NowShell>
    );
  }

  const coming = upcomingLesson(slots, clock.today, clock.now);
  const toLog = lessons.filter((s) => needsLog(s, clock));
  const nextLine = coming && (
    <Link href={`/lessons/${coming.id}`} className="flex items-center gap-3 rounded-xl bg-bg p-3 transition-colors hover:bg-line-2">
      <SubjectIcon id={coming.subjectId} size="sm" />
      <span className="min-w-0 flex-1 text-[14px]">
        <span className="block text-[12px] font-semibold text-muted">
          {coming.date === addDays(clock.today, 1) ? "Αύριο" : `${dayName(coming.date)} ${shortDate(coming.date)}`} · {coming.start}
        </span>
        <span className="font-semibold">
          {name(coming)} · {cls(coming)?.name}
        </span>
      </span>
      <ArrowRight className="size-4 text-muted" />
    </Link>
  );

  if (lessons.length)
    return (
      <NowShell label="Η ΜΕΡΑ ΤΕΛΕΙΩΣΕ">
        {toLog.length ? (
          <>
            <p className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">Κλείσε τη μέρα σε ένα λεπτό</p>
            <p className="-mt-1.5 text-[14px] text-ink-2">
              {toLog.length} {toLog.length === 1 ? "μάθημα περιμένει" : "μαθήματα περιμένουν"} «Έγινε» και δύο λέξεις.
            </p>
            <button
              type="button"
              onClick={openCloseDay}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand-hover"
            >
              <NotebookPen className="size-4" /> Κλείσιμο ημέρας
            </button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <CheckCircle2 className="size-5 text-emerald-600" /> Όλα καταγράφηκαν. Καλή ξεκούραση!
          </p>
        )}
        {nextLine}
      </NowShell>
    );

  const holiday = holidayOn(country, clock.today);
  return (
    <NowShell label={holiday ? "ΑΡΓΙΑ" : "ΣΗΜΕΡΑ"}>
      <p className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">{holiday ?? "Κανένα μάθημα σήμερα"}</p>
      {nextLine ??
        (!timetable.length && (
          <Link
            href="/settings/timetable"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand-hover"
          >
            <CalendarClock className="size-4" /> Πρόσθεσε το ωρολόγιο
          </Link>
        ))}
    </NowShell>
  );
}

/** The top of Today: the date, a greeting, the day so far, and what's on now. */
export function TodayHero() {
  const profile = useApp((s) => s.profile);
  const { clock, lessons, nowMin } = useToday();
  const country = profile.country;
  const week = weekNumber(country, clock.today);
  const term = termOn(country, clock.today);
  const firstName = vocative(profile.displayName.split(" ")[0] ?? "");
  const materials = useApp((s) => s.materials);
  const reports = useReports((s) => s.reports);
  const saved = minutesSavedThisWeek(materials, Object.values(reports), clock.today);
  const greeting = nowMin < 12 * 60 ? "Καλημέρα" : nowMin < 18 * 60 ? "Καλό απόγευμα" : "Καλησπέρα";

  return (
    <section
      {...rise(0)}
      aria-label="Σήμερα"
      className={clsx(
        rise(0).className,
        "relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#14275f_0%,#1e3a8a_55%,#2c4fb0_100%)] p-5 text-white sm:p-7",
      )}
    >
      {/* Soft light and a fine grid, like squared exercise-book paper. */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-32 -z-10 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.18),transparent)]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(180deg,black,transparent_85%)]"
      />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-8">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-1.5">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-white/65">{caps(longDate(clock.today).replace(",", ""))}</p>
            <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
              {greeting}
              {firstName && <span className="text-white/70">, {firstName}</span>}
            </h1>
          </div>
          {(week || term || saved > 0) && (
            <div className="flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
              {week && <span className="rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-white/15">Εβδομάδα {week}</span>}
              {term && <span className="rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-white/15">{term}</span>}
              {saved > 0 && (
                // The value, as a number: what «Ετοίμασε» and the ΣΕΠ saved since Monday.
                <button
                  type="button"
                  onClick={() => toast("Περίπου: 25′ για κάθε φύλλο ή σχέδιο, 20′ για τεστ, 15′ για κάθε επίπεδο, 10′ για κάθε ΣΕΠ που έλεγξες.")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-50 ring-1 ring-emerald-300/40 transition-colors hover:bg-emerald-400/30"
                >
                  <Timer className="size-3.5" /> Γλίτωσες ~{hoursMinutes(saved)} αυτή την εβδομάδα
                </button>
              )}
            </div>
          )}
          <DayProgress lessons={lessons} nowMin={nowMin} />
        </div>
        <NowCard />
      </div>
    </section>
  );
}

/** The AI, in the middle of the page: say it in a sentence, or tap one of the four results. */
export function AskBar({ index = 1 }: { index?: number }) {
  const [text, setText] = useState("");
  const { slots, clock } = useToday();
  const subjects = useSubjects();
  const next = upcomingLesson(slots, clock.today, clock.now);
  const subject = next && subjects.find((s) => s.id === next.subjectId)?.name;
  const r = rise(index);
  return (
    <section {...r} aria-label="Ετοίμασε με AI" className={clsx(r.className, "rounded-2xl bg-[linear-gradient(120deg,var(--color-brand-100),#e9def7_50%,var(--color-amber-100))] p-px shadow-card")}>
      <div className="grid gap-3 rounded-[calc(1rem-1px)] bg-surface p-3.5 sm:p-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            openPrepare({ text: text.trim() });
            setText("");
          }}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Sparkles className="size-[18px]" />
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            aria-label="Τι να ετοιμάσω;"
            placeholder={subject ? `Τι να ετοιμάσω για ${subject};` : "Τι να ετοιμάσω;"}
            className="h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted sm:text-[15px]"
          />
          <button
            type="submit"
            aria-label="Ετοίμασέ το"
            disabled={!text.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-brand/20"
          >
            <ArrowUp className="size-4" strokeWidth={2.2} />
          </button>
        </form>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(90deg,black_85%,transparent)]">
          {PREP_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => openPrepare({ kind: k })}
              className="h-8 shrink-0 rounded-full border border-line bg-bg px-3 text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand-100 hover:bg-brand-50 hover:text-brand"
            >
              {PREP[k].title}
            </button>
          ))}
          <Link
            href="/week"
            className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-3 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-100"
          >
            Όλη η εβδομάδα <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Ring({ value, total, label, index }: { value: number; total: number; label: string; index: number }) {
  const pct = total ? value / total : 0;
  const c = 2 * Math.PI * 18;
  const r = rise(index);
  return (
    <div {...r} className={clsx(r.className, "flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card")}>
      <svg viewBox="0 0 44 44" className="size-12 shrink-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-line-2" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="min-w-0">
        <p className="text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {value}
          <span className="text-[15px] text-muted">/{total}</span>
        </p>
        <p className="mt-1 text-[12.5px] font-medium leading-tight text-muted">{label}</p>
      </div>
    </div>
  );
}

/** Two honest numbers: lessons taught today, and the week's lessons that already have material. */
export function DayStats({ index = 2 }: { index?: number }) {
  const { slots, clock, lessons, nowMin } = useToday();
  const monday = startOfWeek(clock.today);
  const week = slots.filter((s) => s.date >= clock.today && s.date <= addDays(monday, 4) && !s.carriedToId);
  const ready = week.filter((s) => s.materialIds.length > 0).length;
  if (!lessons.length && !week.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Ring index={index} value={lessons.filter((s) => timeToMin(s.end) <= nowMin).length} total={lessons.length} label="μαθήματα σήμερα" />
      <Ring index={index + 1} value={ready} total={week.length} label="έτοιμα με υλικό" />
    </div>
  );
}

/** Monday to Friday at a glance, a dot per lesson in its subject's colour. */
export function WeekStrip({ index = 4 }: { index?: number }) {
  const { slots, clock } = useToday();
  const country = useApp((s) => s.profile.country);
  const monday = startOfWeek(clock.today);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const r = rise(index);
  return (
    <section {...r} aria-labelledby="week-h" className={clsx(r.className, "grid gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card")}>
      <h2 id="week-h" className="flex items-center justify-between text-[13px] font-bold text-muted">
        <span>Η εβδομάδα</span>
        <Link href="/schedule" className="inline-flex items-center gap-1 font-semibold text-brand-500 hover:underline">
          Πρόγραμμα <ArrowRight className="size-3.5" />
        </Link>
      </h2>
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const day = slotsOn(slots, d).filter((s) => !s.carriedToId);
          const off = holidayOn(country, d);
          const isToday = d === clock.today;
          return (
            <Link
              key={d}
              href={`/schedule?d=${d}`}
              aria-label={`${dayName(d)} ${shortDate(d)}: ${off ? `αργία, ${off}` : `${day.length} μαθήματα`}`}
              className={clsx(
                "grid min-h-[5.5rem] content-start justify-items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors",
                isToday ? "bg-brand text-white" : "hover:bg-line-2",
                d < clock.today && !isToday && "opacity-55",
              )}
            >
              <span className={clsx("text-[11px] font-bold tracking-[0.06em]", isToday ? "text-white/75" : "text-muted")}>{caps(dayName(d).slice(0, 3))}</span>
              <span className="text-[17px] font-semibold leading-none tabular-nums">{Number(d.slice(8))}</span>
              {off ? (
                <span className={clsx("text-[10.5px] font-semibold", isToday ? "text-white/80" : "text-amber")}>Αργία</span>
              ) : (
                <span className="flex max-w-full flex-wrap justify-center gap-[3px]">
                  {day.slice(0, 8).map((s) => (
                    <span key={s.id} className={clsx("size-[7px] rounded-full", isToday ? "bg-white/85" : SUBJECT_STYLE[s.subjectId].bar)} />
                  ))}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
