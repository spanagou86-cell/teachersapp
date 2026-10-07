"use client";

import clsx from "clsx";
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, Loader2, Paperclip, RotateCcw, Sparkles, X } from "@/components/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useClock } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, Segmented } from "@/components/ui";
import { aiObjectives } from "@/lib/ai/client";
import { addDays, dayName, shortDate, startOfWeek, timeToMin, weekday } from "@/lib/dates";
import { KIND_LABEL, LEVEL_LABEL } from "@/lib/materials";
import { LESSON_PACK, PREP, prepRequest, previousTopic, type PrepKind } from "@/lib/prepare";
import { sortSlots } from "@/lib/schedule";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { runBatch, useBatch, type JobInput } from "@/lib/store/jobs";
import type { LessonSlot } from "@/lib/types";

type Which = "this" | "next";
type Make = "worksheet" | "quiz" | "lesson";

const MAKE: { value: Make; label: string; sub: string; calls: number }[] = [
  { value: "worksheet", label: "Φύλλο εργασίας", sub: "ένα για κάθε μάθημα", calls: 1 },
  { value: "quiz", label: "Τεστ 10′", sub: "ένα για κάθε μάθημα", calls: 1 },
  { value: "lesson", label: "Όλο το μάθημα", sub: "σχέδιο, φύλλο, τεστ εξόδου", calls: 3 },
];

/**
 * «Η εβδομάδα σε 10 λεπτά»: every lesson of the week in one list, the topics already there from
 * the syllabus; one tap makes the material for all of them and fills the objectives for the head teacher.
 */
export default function WeekPage() {
  const clock = useClock();
  const slots = useApp((s) => s.slots);
  const classes = useApp((s) => s.classes);
  const country = useApp((s) => s.profile.country);
  const demo = useApp((s) => s.mode) !== "cloud";
  const updateSlot = useApp((s) => s.updateSlot);
  const setPlans = useApp((s) => s.setPlans);
  const subjects = useSubjects();
  const batch = useBatch();

  // From Thursday on, the week to prepare is the next one.
  const [which, setWhich] = useState<Which>(weekday(clock.today) >= 4 || weekday(clock.today) === 0 ? "next" : "this");
  const monday = addDays(startOfWeek(clock.today), which === "next" || weekday(clock.today) === 0 ? 7 : 0);
  const friday = addDays(monday, 4);
  const lessons = useMemo(
    () =>
      sortSlots(slots).filter(
        (s) =>
          s.date >= monday &&
          s.date <= friday &&
          !s.carriedToId &&
          s.status === "planned" &&
          (s.date > clock.today || (s.date === clock.today && timeToMin(s.start) > timeToMin(clock.now))),
      ),
    [slots, monday, friday, clock.today, clock.now],
  );

  const [make, setMake] = useState<Make>("worksheet");
  const [objectives, setObjectives] = useState(true);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ made: number; failed: number; plans: number } | null>(null);
  const chosen = lessons.filter((s) => !skipped.has(s.id) && !s.materialIds.length);
  const calls = chosen.length * (MAKE.find((m) => m.value === make)?.calls ?? 1) + (objectives ? 1 : 0);
  const running = batch.active;
  const status = (id: string) => batch.items.find((i) => i.slotId === id);
  const name = (s: LessonSlot) => subjects.find((x) => x.id === s.subjectId)?.name ?? "";
  const cls = (s: LessonSlot) => classes.find((c) => c.id === s.classId);

  const toggle = (id: string) =>
    setSkipped((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** The same request «Ετοίμασε» makes for one lesson, with its topic or the one before it. */
  const jobFor = (s: LessonSlot): JobInput & { slotId: string } => {
    const subject = name(s);
    const grade = cls(s)?.grade ?? "";
    const piece = (kind: PrepKind) => {
      const { title, hint } = prepRequest({ kind, subject, grade, topic: s.topic.trim(), previous: previousTopic(slots, s) });
      return {
        request: { title, kindLabel: KIND_LABEL[PREP[kind].kind], subject, subjectId: s.subjectId, grade, levelLabel: LEVEL_LABEL.standard, withSolutions: true, hint, country },
        material: { title, classId: s.classId, subjectId: s.subjectId, kind: PREP[kind].kind },
      };
    };
    const kinds: PrepKind[] = make === "lesson" ? LESSON_PACK : [make];
    const [first, ...rest] = kinds.map(piece);
    return { label: `${PREP[kinds[0]].title} · ${s.topic || subject}`, ...first, slotId: s.id, pack: rest.length ? rest : undefined };
  };

  const go = async () => {
    if (!chosen.length && !objectives) return;
    setResult(null);
    const list = chosen.map(jobFor);
    // The objectives for the programme come in one request, alongside the material.
    const plansFor = lessons.filter((s) => s.topic.trim() && !s.plan?.trim());
    const plansJob =
      objectives && plansFor.length
        ? aiObjectives(
            plansFor.map((s) => ({ id: s.id, subject: name(s), grade: cls(s)?.grade ?? "", topic: s.topic })),
            country,
            demo,
          )
        : Promise.resolve(null);
    const [items, plans] = await Promise.all([list.length ? runBatch(list) : Promise.resolve([]), plansJob]);
    let filled = 0;
    if (plans?.ok) {
      setPlans(plans.data);
      filled = Object.keys(plans.data).length;
    } else if (plans && !plans.ok) toast(plans.error);
    setResult({ made: items.filter((i) => i.status === "done").length, failed: items.filter((i) => i.status === "failed").length, plans: filled });
  };

  const byDay = [0, 1, 2, 3, 4].map((i) => addDays(monday, i)).map((d) => ({ date: d, list: lessons.filter((s) => s.date === d) }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back="/"
        eyebrow="Ετοίμασε"
        title="Η εβδομάδα σε 10 λεπτά"
        subtitle={`Υλικό για όλα τα μαθήματα και στόχοι για τον προγραμματισμό, με ένα πάτημα · ${shortDate(monday)}–${shortDate(friday)}`}
      />

      <div className="grid grid-cols-1 gap-4 pb-28">
        <Segmented<Which>
          value={which}
          onChange={(v) => (setWhich(v), setSkipped(new Set()), setResult(null))}
          options={[
            { value: "this", label: "Αυτή την εβδομάδα" },
            { value: "next", label: "Την επόμενη" },
          ]}
        />

        {result && (
          <Card className="grid gap-3 border-emerald-200 bg-emerald-50/60 p-4" role="status">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <CheckCircle2 className="size-5 text-emerald-600" /> Η εβδομάδα είναι έτοιμη
            </p>
            <p className="text-[14px] text-ink-2">
              {[
                result.made && `${result.made} ${result.made === 1 ? "μάθημα πήρε" : "μαθήματα πήραν"} υλικό`,
                result.plans && `στόχοι σε ${result.plans} ${result.plans === 1 ? "μάθημα" : "μαθήματα"}`,
                result.failed && `${result.failed} δεν έγιναν· ξαναδοκίμασε`,
              ]
                .filter(Boolean)
                .join(" · ")}
              . Έλεγξέ τα πριν τα μοιράσεις.
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/journal?view=plan&class=all&d=${monday}`}>
                <ClipboardCheck className="size-4" /> Προγραμματισμός για τον Διευθυντή
              </ButtonLink>
              <ButtonLink href={`/schedule?view=week&d=${monday}`} variant="secondary">
                Στο Πρόγραμμα <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </Card>
        )}

        {!lessons.length ? (
          <Card className="p-6 text-center text-muted">Δεν υπάρχουν μαθήματα να ετοιμάσεις αυτή την εβδομάδα.</Card>
        ) : (
          <>
            <section aria-label="Τι να φτιάξω" className="grid gap-2">
              <h2 className="px-1 text-[13px] font-bold text-muted">Για κάθε μάθημα χωρίς υλικό</h2>
              <div className="grid grid-cols-3 gap-2">
                {MAKE.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={make === m.value}
                    disabled={running}
                    onClick={() => setMake(m.value)}
                    className={clsx(
                      "grid min-h-[4.5rem] content-center gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-60",
                      make === m.value ? "border-brand bg-brand-50 text-brand shadow-[inset_0_0_0_1px_var(--color-brand)]" : "border-line bg-surface hover:bg-line-2",
                    )}
                  >
                    <span className="text-[14px] font-semibold leading-tight">{m.label}</span>
                    <span className="text-[12px] leading-tight text-muted">{m.sub}</span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-[14px]">
                <input type="checkbox" checked={objectives} disabled={running} onChange={(e) => setObjectives(e.target.checked)} className="size-5 accent-brand-500" />
                <span className="min-w-0 flex-1">
                  <b className="block font-semibold">Και στόχοι για τον προγραμματισμό</b>
                  <span className="text-[12.5px] text-muted">Για τα μαθήματα που δεν έχουν· τους ελέγχεις πριν την εκτύπωση</span>
                </span>
              </label>
            </section>

            <section aria-label="Τα μαθήματα της εβδομάδας" className="grid gap-4">
              {byDay
                .filter((d) => d.list.length)
                .map(({ date, list }) => (
                  <div key={date} className="grid gap-1.5">
                    <h3 className="px-1 text-[13px] font-bold text-muted">
                      {dayName(date)} {shortDate(date)}
                    </h3>
                    <ul className="grid gap-1.5">
                      {list.map((s) => {
                        const has = s.materialIds.length > 0;
                        const on = !has && !skipped.has(s.id);
                        const st = status(s.id);
                        return (
                          <li key={s.id} className={clsx("flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5", on ? "border-line" : "border-line-2 opacity-70")}>
                            <SubjectIcon id={s.subjectId} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-muted tabular-nums">
                                {s.start} · {name(s)} · {cls(s)?.name}
                              </p>
                              <input
                                defaultValue={s.topic}
                                disabled={running}
                                onBlur={(e) => e.target.value.trim() !== s.topic && updateSlot(s.id, { topic: e.target.value.trim().slice(0, 120) })}
                                maxLength={120}
                                aria-label={`Θέμα: ${dayName(s.date)} ${s.start} ${name(s)}`}
                                placeholder={previousTopic(slots, s) ? `μετά το «${previousTopic(slots, s)}»` : "Θέμα (προαιρετικό)"}
                                className="w-full truncate bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/70"
                              />
                            </div>
                            {st?.status === "running" ? (
                              <Loader2 className="size-5 shrink-0 animate-spin text-brand" aria-label="Φτιάχνεται" />
                            ) : st?.status === "done" ? (
                              <Link href={st.href ?? `/lessons/${s.id}`} className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[12.5px] font-semibold text-emerald-700">
                                <Check className="size-4" /> Έτοιμο
                              </Link>
                            ) : st?.status === "failed" ? (
                              <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-danger" title={st.error}>
                                <X className="size-4" /> Δεν έγινε
                              </span>
                            ) : has ? (
                              <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-muted">
                                <Paperclip className="size-3.5" /> έχει υλικό
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={running}
                                onChange={() => toggle(s.id)}
                                aria-label={`Ετοίμασε: ${dayName(s.date)} ${s.start} ${name(s)}`}
                                className="size-5 shrink-0 accent-brand-500"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </section>
          </>
        )}
      </div>

      {lessons.length > 0 && (
        <div className="no-print fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 px-4 lg:bottom-6 lg:left-60">
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-line bg-surface/95 p-2.5 pl-4 shadow-pop backdrop-blur">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
              {running ? (
                `Φτιάχνω ${batch.items.filter((i) => i.status === "done").length + 1} από ${batch.items.length}… μπορείς να συνεχίσεις άλλη δουλειά`
              ) : (
                <>
                  <b className="text-ink">{chosen.length}</b> {chosen.length === 1 ? "μάθημα" : "μαθήματα"}
                  {!demo && <span className="text-muted"> · {calls} αιτήματα AI</span>}
                </>
              )}
            </p>
            <Button onClick={go} disabled={running || (!chosen.length && !objectives)} className="shrink-0">
              {running ? <Loader2 className="size-4 animate-spin" /> : result?.failed ? <RotateCcw className="size-4" /> : <Sparkles className="size-4" />}
              {running ? "Φτιάχνω…" : "Ετοίμασέ τα"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
