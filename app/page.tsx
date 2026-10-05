"use client";

import { ArrowRight, CalendarClock, CalendarOff, NotebookPen, Plus, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { needsLog, useClock } from "@/components/lesson";
import { MobileBrandBar } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { LogRing, Timeline } from "@/components/timeline";
import { toast } from "@/components/toast";
import { ButtonLink, Card, cx } from "@/components/ui";
import { dayName, longDate, shortDate, timeToMin } from "@/lib/dates";
import { slotsOn, sortSlots, upcomingLesson } from "@/lib/schedule";
import { holidayOn, termOn, weekNumber } from "@/lib/schoolYear";
import { vocative } from "@/lib/greek";
import { useApp } from "@/lib/store";
import { AutoText } from "@/components/text";

function Tasks() {
  const tasks = useApp((s) => s.tasks);
  const toggle = useApp((s) => s.toggleTask);
  const add = useApp((s) => s.addTask);
  const remove = useApp((s) => s.removeTask);
  const edit = useApp((s) => s.editTask);
  const restore = useApp((s) => s.restoreTask);
  const [text, setText] = useState("");
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  return (
    <section className="grid gap-2" aria-labelledby="tasks-h">
      <h2 id="tasks-h" className="flex items-baseline justify-between text-sm font-bold text-muted">
        <span>Εκκρεμότητες</span>
        <span className="tabular-nums">{open.length}</span>
      </h2>
      <ul className="grid gap-1.5">
        {[...open, ...done].map((t) => (
          <li key={t.id} className="group flex items-center gap-1 rounded-xl border border-line bg-surface pl-1.5 pr-1">
            <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center">
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} aria-label={t.text} className="size-5 cursor-pointer accent-brand-500" />
            </label>
            <span className={cx("min-w-0 flex-1 py-2 text-[14px]", t.done && "text-muted line-through")}>
              <AutoText
                value={t.text}
                onSave={(v) => edit(t.id, v)}
                label="Κείμενο εκκρεμότητας"
                maxLength={200}
                className={cx("w-full rounded-md bg-transparent px-1 outline-none focus:bg-line-2", t.done && "line-through")}
              />
              {(t.time || t.detail) && (
                <span className="block text-[12px] text-muted">
                  {t.time}
                  {t.time && t.detail && " · "}
                  {t.detail}
                </span>
              )}
            </span>
            <button
              type="button"
              aria-label={`Διαγραφή: ${t.text}`}
              onClick={() => {
                remove(t.id);
                toast("Η εκκρεμότητα διαγράφηκε", { label: "Αναίρεση", run: () => restore(t) });
              }}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger hover-capable:opacity-0 focus:opacity-100 hover-capable:group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2 rounded-xl px-3 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add(text.trim());
          setText("");
        }}
      >
        <Plus className="size-4 text-muted" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Πρόσθεσε κάτι…" aria-label="Νέα εκκρεμότητα" className="h-9 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
      </form>
    </section>
  );
}

/** Lessons from earlier days that still wait for a note. */
function Backlog() {
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const clock = useClock();
  const old = sortSlots(slots.filter((s) => s.date < clock.today && needsLog(s, clock))).slice(-5).reverse();
  if (!old.length) return null;
  return (
    <section className="grid gap-2" aria-labelledby="backlog-h">
      <h2 id="backlog-h" className="text-sm font-bold text-muted">Από προηγούμενες μέρες</h2>
      {old.map((s) => (
        <Link key={s.id} href={`/lessons/${s.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 hover:bg-line-2">
          <SubjectIcon id={s.subjectId} size="sm" />
          <span className="min-w-0 flex-1 text-[14px]">
            <span className="block font-semibold">{subjects.find((x) => x.id === s.subjectId)?.name}</span>
            <span className="text-[12px] text-muted">
              {dayName(s.date)} {shortDate(s.date)} · {s.start} · τι διδάχθηκε;
            </span>
          </span>
          <ArrowRight className="size-4 text-muted" />
        </Link>
      ))}
    </section>
  );
}

export default function TodayPage() {
  const slots = useApp((s) => s.slots);
  const profile = useApp((s) => s.profile);
  const timetable = useApp((s) => s.timetable);
  const subjects = useApp((s) => s.subjects);
  const clock = useClock();
  const { today, now } = clock;
  const country = profile.country;

  const todays = slotsOn(slots, today);
  const ended = todays.filter((s) => timeToMin(s.end) <= timeToMin(now));
  const logged = ended.filter((s) => s.status !== "planned").length;
  const week = weekNumber(country, today);
  const term = termOn(country, today);
  const holiday = holidayOn(country, today);
  const next = upcomingLesson(slots, today, now);
  const firstName = vocative(profile.displayName.split(" ")[0] ?? "");
  const greeting = timeToMin(now) < timeToMin("12:00") ? "Καλημέρα" : "Καλησπέρα";

  const nothingToday = (
    <Card className="grid gap-3 p-5">
      <div className="flex items-center gap-3">
        <CalendarOff className="size-6 text-muted" />
        <p className="font-bold">{holiday ? `Αργία · ${holiday}` : "Κανένα μάθημα σήμερα"}</p>
      </div>
      {next ? (
        <Link href={`/lessons/${next.id}`} className="flex items-center gap-3 rounded-xl bg-bg p-3 hover:bg-line-2">
          <SubjectIcon id={next.subjectId} size="sm" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block text-[12px] font-semibold text-muted">Επόμενο μάθημα</span>
            <span className="font-semibold">
              {dayName(next.date)} {shortDate(next.date)} · {next.start} · {subjects.find((x) => x.id === next.subjectId)?.name}
            </span>
          </span>
          <ArrowRight className="size-4 text-muted" />
        </Link>
      ) : (
        !timetable.length && (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted">Πρόσθεσε το ωρολόγιο πρόγραμμά σου: μαθήματα, {country === "cy" ? "παιδονομίες" : "εφημερίες"} και κενά.</p>
            <ButtonLink href="/settings/timetable">
              <CalendarClock className="size-4" /> Ωρολόγιο
            </ButtonLink>
          </div>
        )
      )}
    </Card>
  );

  return (
    <div>
      <MobileBrandBar />
      <header className="mb-4 grid gap-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] leading-tight tracking-tight sm:text-[34px]">{longDate(today).replace(",", "")}</h1>
        <p className="text-[14px] text-muted sm:text-[15px]">
          {[week && `Εβδομάδα ${week}`, term, `${greeting}${firstName ? `, ${firstName}` : ""}`].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-3">
          {ended.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
              <LogRing done={logged} total={ended.length} />
              <div className="min-w-0">
                <p className="font-bold">
                  {logged} από {ended.length} {ended.length === 1 ? "καταγράφηκε" : "καταγράφηκαν"}
                </p>
                <p className="text-[12.5px] text-muted">
                  {logged < ended.length ? "Πάτα «Έγινε» στο μάθημα που τελείωσε." : "Όλα τα μαθήματα που τελείωσαν έχουν καταγραφεί."}
                </p>
              </div>
            </div>
          )}
          <Timeline date={today} empty={nothingToday} />
          {todays.length > 0 && (
            <Link href="/schedule" className="inline-flex items-center gap-1 justify-self-start px-1 text-sm font-semibold text-brand-500 hover:underline">
              Όλη η εβδομάδα <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
        <div className="grid content-start gap-6">
          <Backlog />
          <Tasks />
          {ended.length === 0 && todays.length > 0 && (
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <NotebookPen className="size-4" /> Μετά από κάθε μάθημα θα σου ζητάμε δύο λέξεις για το τι διδάχθηκε.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
