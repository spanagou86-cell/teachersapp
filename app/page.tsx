"use client";

import { ArrowRight, BookOpenCheck, CalendarClock, CalendarDays, ClipboardCheck, CalendarOff, CheckCircle2, NotebookPen, Plus, Sparkles, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { needsLog, useClock } from "@/components/lesson";
import { MobileBrandBar } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { openPrepare } from "@/components/prepare";
import { Timeline } from "@/components/timeline";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, cx } from "@/components/ui";
import { addDays, dayName, longDate, shortDate, startOfWeek, timeToMin, weekday } from "@/lib/dates";
import { upcoming } from "@/lib/prepare";
import { slotsOn, sortSlots, upcomingLesson } from "@/lib/schedule";
import { holidayOn, schoolYearStart, termOn, weekNumber } from "@/lib/schoolYear";
import { reportKey } from "@/lib/sep";
import { useReports } from "@/lib/store/reports";
import { vocative } from "@/lib/greek";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { AutoText } from "@/components/text";
import { openSyllabus } from "@/components/syllabus";
import { openCloseDay } from "@/components/closeDay";

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
  const subjects = useSubjects();
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

/**
 * One suggestion at a time, so Today always says what to do next: close the day, or get the
 * coming lessons ready (the next lesson has its own button on its card).
 */
function NextStep() {
  const slots = useApp((s) => s.slots);
  const classes = useApp((s) => s.classes);
  const students = useApp((s) => s.students);
  const country = useApp((s) => s.profile.country);
  const reports = useReports((s) => s.reports);
  const subjects = useSubjects();
  const clock = useClock();
  const { today, now } = clock;
  const todays = slotsOn(slots, today);
  const toLog = todays.filter((s) => needsLog(s, clock));
  const dayOver = todays.length > 0 && timeToMin(now) >= timeToMin(todays.at(-1)!.end);
  const [, ...later] = upcoming(slots, today, now, 16).filter((s) => !s.carriedToId);
  const days = [...new Set(later.map((s) => s.date))].slice(0, 2);
  const bare = later.filter((s) => days.includes(s.date) && !s.materialIds.length);
  const group = bare.filter((s) => s.date === bare[0]?.date);
  const name = (id: string) => subjects.find((x) => x.id === id)?.name;
  const box = "flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3";

  if (dayOver && toLog.length)
    return (
      <div className={box}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber">
          <NotebookPen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Κλείσε τη μέρα</p>
          <p className="text-[13px] text-muted">
            {toLog.length} {toLog.length === 1 ? "μάθημα περιμένει" : "μαθήματα περιμένουν"} «Έγινε» και δύο λέξεις για το τι διδάχθηκε.
          </p>
        </div>
        <Button size="sm" onClick={openCloseDay}>
          Κλείσιμο
        </Button>
      </div>
    );
  // ΣΕΠ season (mid-January, early June): how many reports are ready.
  const md = today.slice(5);
  const season = country === "cy" && ((md >= "01-07" && md <= "01-31") || (md >= "05-25" && md <= "06-15"));
  if (season && classes.length) {
    const year = schoolYearStart(today);
    const term = md <= "01-31" ? 1 : 2;
    const roster = students.filter((s) => classes.some((c) => c.id === s.classId));
    const ready = roster.filter((s) => reports[reportKey(s.id, year, term)]?.reviewed).length;
    if (roster.length && ready < roster.length)
      return (
        <div className={box}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <ClipboardCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Σχολική Έκθεση Προόδου · {term === 1 ? "Α΄" : "Β΄"} τετράμηνο</p>
            <p className="text-[13px] text-muted">
              {ready} από {roster.length} έτοιμες · ★ με ένα άγγιγμα, προσχέδια σχολίων με AI
            </p>
          </div>
          <ButtonLink size="sm" href={`/classes/${classes[0].id}/sep`}>
            Συνέχεια
          </ButtonLink>
        </div>
      );
  }
  // Friday afternoon: next week's programme, ready to check and hand to the head teacher.
  if (weekday(today) === 5 && (dayOver || timeToMin(now) >= 12 * 60)) {
    const monday = addDays(startOfWeek(today), 7);
    const next = slots.filter((s) => s.date >= monday && s.date <= addDays(monday, 4) && !s.carriedToId);
    if (next.length)
      return (
        <div className={box}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ο προγραμματισμός της επόμενης εβδομάδας είναι έτοιμος</p>
            <p className="text-[13px] text-muted">
              {next.length} μαθήματα{next.some((s) => !s.topic.trim() || !s.plan?.trim()) ? " · λείπουν θέματα ή στόχοι" : " · με θέματα και στόχους"}
            </p>
          </div>
          <ButtonLink size="sm" href={`/journal?view=plan&class=all&d=${monday}`}>
            Άνοιγμα
          </ButtonLink>
        </div>
      );
  }
  // Lessons without a topic: the syllabus, given once, fills them for the whole year.
  const noTopic = upcoming(slots, today, now, 10).filter((s) => !s.topic.trim());
  if (noTopic.length >= 3) {
    const first = noTopic[0];
    return (
      <div className={box}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <BookOpenCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{noTopic.length} επόμενα μαθήματα χωρίς θέμα</p>
          <p className="text-[13px] text-muted">Δώσε μία φορά την ύλη· τα θέματα μπαίνουν μόνα τους ως τον Ιούνιο.</p>
        </div>
        <Button size="sm" onClick={() => openSyllabus({ classId: first.classId, subjectId: first.subjectId })}>
          Ύλη
        </Button>
      </div>
    );
  }
  if (group.length) {
    const d = group[0].date;
    const when = d === today ? "Σήμερα ακόμη" : d === addDays(today, 1) ? "Αύριο" : dayName(d);
    return (
      <div className={box}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {when}: {group.length} {group.length === 1 ? "μάθημα" : "μαθήματα"} χωρίς υλικό
          </p>
          <p className="truncate text-[13px] text-muted">{group.map((s) => `${name(s.subjectId)} ${s.start}`).join(" · ")}</p>
        </div>
        <Button size="sm" onClick={() => openPrepare({ slotId: group[0].id })}>
          Ετοίμασε
        </Button>
      </div>
    );
  }
  if (todays.length && !toLog.length)
    return (
      <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
        <CheckCircle2 className="size-4 text-brand-500" /> Τα επόμενα μαθήματα έχουν υλικό.
      </p>
    );
  return null;
}

export default function TodayPage() {
  const slots = useApp((s) => s.slots);
  const profile = useApp((s) => s.profile);
  const timetable = useApp((s) => s.timetable);
  const subjects = useSubjects();
  const clock = useClock();
  const { today, now } = clock;
  const country = profile.country;

  const todays = slotsOn(slots, today);
  const ended = todays.filter((s) => timeToMin(s.end) <= timeToMin(now));
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
        <div className="grid min-w-0 grid-cols-1 content-start gap-3">
          <NextStep />
          <Timeline date={today} empty={nothingToday} ai />
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
              <NotebookPen className="size-4" /> Μετά από κάθε μάθημα, πάτα «Έγινε» και γράψε δύο λέξεις για το τι διδάχθηκε.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
