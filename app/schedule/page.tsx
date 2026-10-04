"use client";

import clsx from "clsx";
import { CalendarCog, ChevronLeft, ChevronRight, CornerDownRight, Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { StatusPill } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { SUBJECT_STYLE } from "@/components/subject";
import { Timeline } from "@/components/timeline";
import { ButtonLink, Card, IconButton, Segmented } from "@/components/ui";
import { addDays, dayMonth, dayName, dayOfMonth, dayShort, isISODate, shortDate, startOfWeek, timeToMin, weekday, weekDates } from "@/lib/dates";
import { dutyLabel, holidayOn, schoolYear, schoolYearStart, termOn, weekNumber, type Country } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { periodsFrom } from "@/lib/timetable";

type View = "week" | "month" | "year";

const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function WeekAgenda({ dates, country }: { dates: string[]; country: Country }) {
  const slots = useApp((s) => s.slots);
  const blocks = useApp((s) => s.blocks);
  const timetable = useApp((s) => s.timetable);
  const classes = useApp((s) => s.classes);
  const subjects = useApp((s) => s.subjects);
  const today = useApp((s) => s.today);
  const weekSlots = slots.filter((s) => s.date >= dates[0] && s.date <= dates[4]);
  const weekBlocks = blocks.filter((b) => b.date >= dates[0] && b.date <= dates[4]);

  // Rows: every time window used this week, else the template's.
  const rows = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    for (const x of [...weekSlots, ...weekBlocks]) map.set(`${x.start}-${x.end}`, { start: x.start, end: x.end });
    const list = map.size ? [...map.values()] : periodsFrom(timetable);
    return list.sort((a, b) => timeToMin(a.start) - timeToMin(b.start) || timeToMin(a.end) - timeToMin(b.end));
  }, [weekSlots, weekBlocks, timetable]);

  return (
    <Card className="hidden overflow-x-auto lg:block">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `76px repeat(5, minmax(0, 1fr))` }}>
        <div className="border-b border-line bg-bg" />
        {dates.map((d) => {
          const isToday = d === today;
          return (
            <div key={d} className="flex items-baseline gap-2 border-b border-l border-line bg-bg px-3 py-2.5">
              <span className={clsx("text-xs font-bold tracking-wide", isToday ? "text-brand-500" : "text-muted")}>{dayShort(d)}</span>
              <span className={clsx("text-xl font-extrabold tabular-nums", isToday && "text-brand-500")}>{dayOfMonth(d)}</span>
              {isToday && <span className="ml-auto rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">ΣΗΜΕΡΑ</span>}
            </div>
          );
        })}
        {rows.map((r, ri) => (
          <div key={`${r.start}-${r.end}`} className="contents">
            <div className="border-b border-line-2 bg-bg px-2 py-2 text-[11.5px] font-semibold leading-tight tabular-nums text-muted">
              {r.start}
              <br />
              {r.end}
            </div>
            {dates.map((d) => {
              const holiday = holidayOn(country, d);
              if (holiday)
                return ri === 0 ? (
                  <div
                    key={d}
                    className="flex items-center justify-center border-b border-l border-line-2 [background-image:repeating-linear-gradient(135deg,var(--color-bg)_0_7px,var(--color-line-2)_7px_14px)]"
                    style={{ gridRow: `span ${rows.length}` }}
                  >
                    <span className="rotate-180 text-xs font-bold text-muted [writing-mode:vertical-rl]">Αργία · {holiday}</span>
                  </div>
                ) : null;
              const slot = weekSlots.find((s) => s.date === d && s.start === r.start && s.end === r.end);
              const block = weekBlocks.find((b) => b.date === d && b.start === r.start && b.end === r.end);
              return (
                <div key={d} className="min-h-[56px] border-b border-l border-line-2 p-1.5">
                  {slot && (
                    <Link
                      href={`/lessons/${slot.id}`}
                      className={clsx(
                        "grid h-full content-start gap-0.5 rounded-lg border-l-[3px] px-2 py-1.5 transition hover:shadow-pop",
                        SUBJECT_STYLE[slot.subjectId].soft,
                        SUBJECT_STYLE[slot.subjectId].border,
                        slot.carriedToId && "opacity-55",
                      )}
                    >
                      <span className="truncate text-[12.5px] font-bold leading-tight">{subjects.find((x) => x.id === slot.subjectId)?.name}</span>
                      <span className="truncate text-[11px] text-muted">
                        {slot.carriedFromId && <CornerDownRight className="mr-0.5 inline size-3 text-amber" />}
                        {classes.find((c) => c.id === slot.classId)?.name}
                        {slot.topic && ` · ${slot.topic}`}
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        <StatusPill slot={slot} />
                        {slot.materialIds.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted">
                            <Paperclip className="size-3" /> {slot.materialIds.length}
                          </span>
                        )}
                      </span>
                    </Link>
                  )}
                  {!slot && block && (
                    <div
                      className={clsx(
                        "h-full rounded-lg px-2 py-1.5 text-[11.5px] font-semibold",
                        block.kind === "duty" && "border-l-[3px] border-duty bg-duty-50 text-duty",
                        block.kind === "free" && "border border-dashed border-line text-muted",
                        block.kind === "meeting" && "bg-info-50 text-info",
                      )}
                    >
                      {block.kind === "duty" ? dutyLabel(country) : block.kind === "free" ? "Κενό" : "Σύσκεψη"}
                      {block.label && <span className="block font-medium opacity-80">{block.label}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function MonthGrid({ year, month, country, onPick }: { year: number; month: number; country: Country; onPick: (d: string) => void }) {
  const slots = useApp((s) => s.slots);
  const today = useApp((s) => s.today);
  const first = iso(year, month, 1);
  const start = startOfWeek(first);
  const days: string[] = [];
  for (let d = start; days.length < 30; d = addDays(d, 1)) {
    if (weekday(d) >= 1 && weekday(d) <= 5) days.push(d);
    if (d > iso(year, month + 1, 0) && weekday(d) === 5) break;
  }
  return (
    <Card className="p-3 sm:p-4">
      <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-bold tracking-wide text-muted">
        {["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const inMonth = d.slice(5, 7) === first.slice(5, 7);
          const holiday = holidayOn(country, d);
          const lessons = slots.filter((s) => s.date === d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={clsx(
                "grid min-h-[72px] content-start gap-1 rounded-xl border p-1.5 text-left transition-colors hover:bg-line-2 sm:min-h-[92px] sm:p-2",
                inMonth ? "border-line bg-surface" : "border-transparent bg-transparent opacity-45",
                d === today && "ring-2 ring-now",
              )}
            >
              <span className="text-[13px] font-bold tabular-nums">{dayOfMonth(d)}</span>
              {holiday ? (
                <span className="line-clamp-2 rounded-md bg-holiday px-1 py-0.5 text-[10.5px] font-semibold leading-tight text-ink-2">{holiday}</span>
              ) : (
                <span className="flex flex-wrap gap-0.5">
                  {lessons.slice(0, 8).map((s) => (
                    <span key={s.id} className={clsx("h-1.5 w-3 rounded-full", SUBJECT_STYLE[s.subjectId].bar)} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function YearView({ country, anchor, onPick }: { country: Country; anchor: string; onPick: (d: string) => void }) {
  const today = useApp((s) => s.today);
  const y = schoolYear(country, schoolYearStart(anchor));
  const startYear = Number(y.start.slice(0, 4));
  const termTint = ["bg-meleti-50", "bg-glossa-50", "bg-fysika-50"];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12.5px] text-ink-2">
        {y.terms.map((t, i) => (
          <span key={t.label} className="flex items-center gap-1.5">
            <i className={clsx("inline-block size-3 rounded", termTint[i])} /> {t.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-3 rounded bg-holiday" /> Αργία / διακοπές
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {y.holidays.map((h) => (
          <span key={h.label + h.from} className="rounded-lg border border-line bg-surface px-2 py-1 text-[12px]">
            {h.label} · {shortDate(h.from)}
            {h.to !== h.from && `–${shortDate(h.to)}`}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, k) => {
          const m = (8 + k) % 12;
          const yr = k < 4 ? startYear : startYear + 1;
          const lead = (new Date(Date.UTC(yr, m, 1)).getUTCDay() + 6) % 7;
          const count = new Date(Date.UTC(yr, m + 1, 0)).getUTCDate();
          let school = 0;
          const cells = Array.from({ length: count }, (_, i) => {
            const d = iso(yr, m, i + 1);
            const wd = (lead + i) % 7;
            const holiday = wd < 5 ? holidayOn(country, d) : undefined;
            const term = wd < 5 && !holiday ? y.terms.findIndex((t) => d >= t.from && d <= t.to) : -1;
            if (term >= 0) school++;
            return { d, wd, holiday, term };
          });
          return (
            <Card key={k} className="grid gap-2 p-3">
              <p className="flex items-baseline justify-between text-sm font-bold">
                {MONTHS[m]} {yr}
                <span className="text-[11px] font-semibold text-muted">{school} {school === 1 ? "μέρα" : "μέρες"}</span>
              </p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] tabular-nums">
                {["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"].map((x, i) => (
                  <span key={i} className="text-[10px] font-bold text-muted">
                    {x}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`l${i}`} />
                ))}
                {cells.map((c) => (
                  <button
                    key={c.d}
                    type="button"
                    title={c.holiday}
                    disabled={c.wd >= 5}
                    onClick={() => onPick(c.d)}
                    className={clsx(
                      "aspect-square rounded-md",
                      c.wd >= 5 && "text-muted opacity-50",
                      c.holiday && "bg-holiday font-bold line-through",
                      c.term >= 0 && termTint[c.term],
                      c.d === today && "font-extrabold ring-2 ring-now",
                    )}
                  >
                    {Number(c.d.slice(8))}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-[12px] text-muted">Ενδεικτικές ημερομηνίες με βάση τους συνήθεις κανόνες του Υπουργείου. Έλεγξέ τες με την εγκύκλιο της χρονιάς.</p>
    </div>
  );
}

function Calendar() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useApp((s) => s.today);
  const country = useApp((s) => s.profile.country);
  const slots = useApp((s) => s.slots);
  const rawView = params.get("view");
  const view: View = rawView === "month" || rawView === "year" ? rawView : "week";
  const rawD = params.get("d");
  const anchor = isISODate(rawD) ? rawD : today;
  const go = (v: View, d: string) => router.replace(`/schedule?view=${v}&d=${d}`, { scroll: false });

  const monday = startOfWeek(weekday(anchor) === 6 || weekday(anchor) === 0 ? addDays(anchor, 2) : anchor);
  const dates = weekDates(monday);
  const day = dates.includes(anchor) ? anchor : dates[0];
  const [y, m] = anchor.split("-").map(Number);
  const week = weekNumber(country, monday) ?? weekNumber(country, dates[4]);
  const term = termOn(country, dates[2]);
  const weekSlots = slots.filter((s) => s.date >= dates[0] && s.date <= dates[4]);
  const done = weekSlots.filter((s) => s.status === "done").length;

  const step = (n: number) => {
    if (view === "week") go("week", addDays(monday, n * 7));
    else if (view === "month") go("month", iso(m + n > 12 ? y + 1 : m + n < 1 ? y - 1 : y, ((m - 1 + n + 12) % 12), 1));
    else go("year", iso(y + n, m - 1, 1));
  };

  const title =
    view === "week" ? (week ? `Εβδομάδα ${week}` : "Εβδομάδα") : view === "month" ? `${MONTHS[m - 1]} ${y}` : `Σχολική χρονιά ${schoolYearStart(anchor)}–${String(schoolYearStart(anchor) + 1).slice(2)}`;
  const subtitle =
    view === "week"
      ? [`${shortDate(dates[0])} – ${shortDate(dates[4])}`, term, `${weekSlots.length} ${weekSlots.length === 1 ? "μάθημα" : "μαθήματα"}${done ? ` · ${done} έγιναν` : ""}`].filter(Boolean).join(" · ")
      : undefined;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Segmented<View>
              value={view}
              onChange={(v) => go(v, anchor)}
              size="sm"
              className="flex-1 sm:w-64 sm:flex-none"
              options={[
                { value: "week", label: "Εβδομάδα" },
                { value: "month", label: "Μήνας" },
                { value: "year", label: "Χρονιά" },
              ]}
            />
            {view !== "year" && (
              <div className="flex items-center gap-1">
                <IconButton label="Προηγούμενο" onClick={() => step(-1)} className="border border-line bg-surface">
                  <ChevronLeft className="size-5" />
                </IconButton>
                <button type="button" onClick={() => go(view, today)} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-semibold hover:bg-line-2">
                  Σήμερα
                </button>
                <IconButton label="Επόμενο" onClick={() => step(1)} className="border border-line bg-surface">
                  <ChevronRight className="size-5" />
                </IconButton>
              </div>
            )}
            <ButtonLink href="/settings/timetable" variant="secondary" size="sm" className="h-9">
              <CalendarCog className="size-4" /> Ωρολόγιο
            </ButtonLink>
          </div>
        }
      />

      {view === "week" && (
        <>
          <div className="lg:hidden">
            <div className="mb-4 grid grid-cols-5 gap-1.5">
              {dates.map((d) => {
                const holiday = holidayOn(country, d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => go("week", d)}
                    aria-pressed={d === day}
                    className={clsx(
                      "flex h-14 flex-col items-center justify-center rounded-xl border text-[11px] font-semibold",
                      d === day ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted",
                      holiday && d !== day && "[background-image:repeating-linear-gradient(135deg,transparent_0_5px,var(--color-line-2)_5px_10px)]",
                    )}
                  >
                    {dayShort(d)}
                    <span className={clsx("text-lg font-bold leading-tight", d === day ? "text-white" : "text-ink")}>{dayOfMonth(d)}</span>
                  </button>
                );
              })}
            </div>
            <h2 className="mb-2 font-bold">
              {dayName(day)}, {dayMonth(day)}
            </h2>
            <Timeline
              date={day}
              empty={
                <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-muted">
                  {holidayOn(country, day) ? `Αργία · ${holidayOn(country, day)}` : "Δεν υπάρχουν μαθήματα."}
                </p>
              }
            />
          </div>
          <WeekAgenda dates={dates} country={country} />
        </>
      )}
      {view === "month" && <MonthGrid year={y} month={m - 1} country={country} onPick={(d) => go("week", d)} />}
      {view === "year" && <YearView country={country} anchor={anchor} onPick={(d) => go("week", d)} />}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense>
      <Calendar />
    </Suspense>
  );
}
