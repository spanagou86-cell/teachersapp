"use client";

import clsx from "clsx";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, Printer, Sparkles } from "@/components/icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useClock } from "@/components/lesson";
import { GrowingTextarea } from "@/components/text";
import { aiObjectives } from "@/lib/ai/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, Card, cx, inputClass, Segmented, Select } from "@/components/ui";
import { addDays, dayName, isISODate, shortDate, startOfWeek, weekday } from "@/lib/dates";
import { journal, periodFor, shiftPeriod, weekPlan, type PeriodKind } from "@/lib/journal";
import { weekNumber, yearFor } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { remote } from "@/lib/store/remote";
import type { LessonSlot } from "@/lib/types";

type Mode = "log" | "plan";
const PERIOD_LABEL: Record<PeriodKind, string> = { week: "Εβδομάδα", month: "Μήνας", term: "Τρίμηνο", year: "Χρονιά" };

/** Lessons of any period: in an account they are read from the database, local edits win. */
function useLessons(from: string, to: string) {
  const mode = useApp((s) => s.mode);
  const local = useApp((s) => s.slots);
  const [fetched, setFetched] = useState<{ key: string; slots: LessonSlot[] } | null>(null);
  const key = `${from}|${to}`;
  useEffect(() => {
    if (mode !== "cloud") return;
    let cancelled = false;
    remote
      .fetchSlots(from, to)
      .then((slots) => !cancelled && setFetched({ key, slots }))
      .catch(() => !cancelled && toast("Δεν φόρτωσαν όλα τα μαθήματα της περιόδου. Έλεγξε τη σύνδεση."));
    return () => {
      cancelled = true;
    };
  }, [mode, from, to, key]);
  return useMemo(() => {
    if (mode !== "cloud") return { slots: local, loading: false };
    if (fetched?.key !== key) return { slots: local, loading: true };
    const byId = new Map(fetched.slots.map((s) => [s.id, s]));
    for (const s of local) byId.set(s.id, s);
    return { slots: [...byId.values()], loading: false };
  }, [mode, local, fetched, key]);
}

function Journal() {
  const router = useRouter();
  const params = useSearchParams();
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const stored = useApp((s) => s.slots);
  const materials = useApp((s) => s.materials);
  const profile = useApp((s) => s.profile);
  const updateSlot = useApp((s) => s.updateSlot);
  const clock = useClock();
  const country = profile.country;

  const view: Mode = params.get("view") === "plan" ? "plan" : "log";
  // Κ.Δ.Π. 168/2024 άρθρο 39: εβδομαδιαίος ή δεκαπενθήμερος προγραμματισμός.
  const weeks: 1 | 2 = params.get("span") === "2" ? 2 : 1;
  const kind: PeriodKind = (["week", "month", "term", "year"] as const).find((k) => k === params.get("period")) ?? "month";
  const anchor = isISODate(params.get("d")) ? params.get("d")! : clock.today;
  const classParam = params.get("class");
  const classId = classParam === "all" ? undefined : classes.some((c) => c.id === classParam) ? classParam! : classes[0]?.id;
  const subjectId = subjects.some((s) => s.id === params.get("subject")) ? params.get("subject")! : undefined;
  const cls = classes.find((c) => c.id === classId);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`/journal?${next.toString()}`, { scroll: false });
  };

  // The plan looks ahead: this week on school days, the coming one at the weekend.
  const weekend = [0, 6].includes(weekday(clock.today));
  const planMonday = isISODate(params.get("d")) ? startOfWeek(anchor) : addDays(startOfWeek(clock.today), weekend ? 7 : 0);
  const period = useMemo(
    () => (view === "log" ? periodFor(kind, anchor, country) : { from: planMonday, to: addDays(planMonday, weeks === 2 ? 11 : 4), label: "" }),
    [view, kind, anchor, country, planMonday, weeks],
  );
  const { slots, loading } = useLessons(period.from, period.to);
  const year = yearFor(country, period.from);

  const log = useMemo(
    () => journal({ slots, period, classId, subjectId, holidays: year.holidays, today: clock.today, now: clock.now }),
    [slots, period, classId, subjectId, year.holidays, clock.today, clock.now],
  );
  const plan = useMemo(() => weekPlan({ slots, monday: planMonday, classId, subjectId, weeks }), [slots, planMonday, classId, subjectId, weeks]);
  const week = weekNumber(country, planMonday);
  const lastWeek = weekNumber(country, addDays(planMonday, 7));

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "";
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "";
  const allClasses = !classId;

  if (!classes.length)
    return (
      <Card className="p-6 text-center">
        <p className="font-bold">Δεν υπάρχουν τμήματα ακόμη</p>
        <p className="mt-1 text-sm text-muted">Πρόσθεσε τμήμα και ωρολόγιο, και η ύλη θα γεμίζει μόνη της.</p>
        <Link href="/classes" className="mt-3 inline-block font-semibold text-brand-500 hover:underline">
          Τάξεις
        </Link>
      </Card>
    );

  const docTitle = view === "log" ? "Ύλη που διδάχθηκε" : weeks === 2 ? "Δεκαπενθήμερος προγραμματισμός" : "Εβδομαδιαίος προγραμματισμός";
  const weekLabel = weeks === 2 && week && lastWeek ? `Εβδομάδες ${week}–${lastWeek} · ` : week ? `Εβδομάδα ${week} · ` : "";
  const docPeriod = view === "log" ? `${period.label} (${shortDate(period.from)} – ${shortDate(period.to)})` : `${weekLabel}${shortDate(planMonday)} – ${shortDate(period.to)}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print">
        <PageHeader
          back={classId ? `/classes/${classId}?tab=progress` : "/schedule"}
          title={docTitle}
          subtitle={
            view === "log"
              ? "Τι διδάχθηκε, από όσα σημειώνεις μετά από κάθε μάθημα. Έτοιμο για εκτύπωση."
              : "Τι θα διδάξεις, με θέματα και στόχους, έτοιμο για τον Διευθυντή (Κ.Δ.Π. 168/2024, άρθρο 39)."
          }
          actions={
            <Button onClick={() => window.print()} disabled={loading}>
              <Printer className="size-4" /> Εκτύπωση / PDF
            </Button>
          }
        />

        <Segmented<Mode>
          value={view}
          onChange={(v) => set({ view: v === "plan" ? "plan" : undefined, d: undefined })}
          options={[
            { value: "log", label: "Τι διδάχθηκε" },
            { value: "plan", label: "Προγραμματισμός" },
          ]}
          className="mb-3"
        />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Select value={classId ?? "all"} onChange={(e) => set({ class: e.target.value })} aria-label="Τμήμα">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.grade}
              </option>
            ))}
            {classes.length > 1 && <option value="all">Όλα τα τμήματα</option>}
          </Select>
          <Select value={subjectId ?? ""} onChange={(e) => set({ subject: e.target.value || undefined })} aria-label="Μάθημα">
            <option value="">Όλα τα μαθήματα</option>
            {subjects.filter((s) => !s.legacy || s.id === subjectId || stored.some((x) => x.subjectId === s.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {view === "plan" && (
            <Segmented<"1" | "2">
              value={weeks === 2 ? "2" : "1"}
              onChange={(v) => set({ span: v === "2" ? "2" : undefined })}
              size="sm"
              className="w-full sm:w-auto sm:min-w-[260px]"
              options={[
                { value: "1", label: "Εβδομάδα" },
                { value: "2", label: "Δεκαπενθήμερο" },
              ]}
            />
          )}
          {view === "log" && (
            <Segmented<PeriodKind>
              value={kind}
              onChange={(k) => set({ period: k })}
              size="sm"
              className="w-full sm:w-auto sm:min-w-[340px]"
              options={(Object.keys(PERIOD_LABEL) as PeriodKind[]).map((k) => ({ value: k, label: PERIOD_LABEL[k] }))}
            />
          )}
          <div className="flex flex-1 items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              aria-label="Προηγούμενο"
              onClick={() => set({ d: view === "log" ? shiftPeriod(kind, anchor, -1, country) : addDays(planMonday, -7 * weeks) })}
              className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:bg-line-2"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="min-w-0 truncate text-center text-sm font-semibold">{view === "log" ? period.label : docPeriod}</span>
            <button
              type="button"
              aria-label="Επόμενο"
              onClick={() => set({ d: view === "log" ? shiftPeriod(kind, anchor, 1, country) : addDays(planMonday, 7 * weeks) })}
              className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:bg-line-2"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {view === "log" && log.missing.length > 0 && (
          <Gaps
            title={`${log.missing.length} ${log.missing.length === 1 ? "μάθημα" : "μαθήματα"} χωρίς σημείωση`}
            hint="Συμπλήρωσε τι διδάχθηκε, για να μη μείνουν κενές γραμμές στην εκτύπωση."
            lessons={log.missing}
            label={(s) => `${dayName(s.date)} ${shortDate(s.date)} · ${s.start} · ${subjectName(s.subjectId)}${allClasses ? ` · ${className(s.classId)}` : ""}`}
            placeholder={(s) => s.topic || "Τι διδάχθηκε"}
            onSave={(s, text) => updateSlot(s.id, { status: "done", taughtNote: text })}
            done="Αποθηκεύτηκε"
          />
        )}
        {view === "plan" && plan.noTopic.length > 0 && (
          <Gaps
            title={`${plan.noTopic.length} ${plan.noTopic.length === 1 ? "μάθημα δεν έχει" : "μαθήματα δεν έχουν"} θέμα`}
            hint="Γράψε την ενότητα που θα διδάξεις, για να είναι πλήρης ο προγραμματισμός."
            lessons={plan.noTopic}
            label={(s) => `${dayName(s.date)} · ${s.start} · ${subjectName(s.subjectId)}${allClasses ? ` · ${className(s.classId)}` : ""}`}
            placeholder={() => "π.χ. Ενότητα 4: Τα κλάσματα"}
            onSave={(s, text) => updateSlot(s.id, { topic: text })}
            done="Αποθηκεύτηκε"
          />
        )}
        {view === "plan" && !loading && plan.noPlan.length > 0 && (
          <Objectives
            lessons={plan.noPlan}
            grade={(id) => classes.find((c) => c.id === id)?.grade ?? ""}
            subjectName={subjectName}
            label={(s) => `${dayName(s.date)} ${shortDate(s.date)} · ${s.start} · ${subjectName(s.subjectId)}${allClasses ? ` · ${className(s.classId)}` : ""}`}
          />
        )}
      </div>

      {/* Phone: a readable list. The A4 page below is for larger screens and for printing. */}
      <div className="no-print sm:hidden">
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-muted">
            <Loader2 className="size-4 animate-spin" /> Φόρτωση…
          </p>
        ) : (
          <MobileList
            days={
              view === "log"
                ? log.months.flatMap((m) => m.rows).reduce<{ date: string; items: { slot?: LessonSlot; text?: string; remark?: string; missing?: boolean }[] }[]>((acc, r) => {
                    const date = r.type === "lesson" ? r.slot.date : r.date;
                    const item = r.type === "lesson" ? { slot: r.slot, remark: r.remark, missing: r.missing } : { text: r.label };
                    if (acc.at(-1)?.date === date) acc.at(-1)!.items.push(item);
                    else acc.push({ date, items: [item] });
                    return acc;
                  }, [])
                : plan.days.map((d) => ({
                    date: d.date,
                    items: d.lessons.length
                      ? d.lessons.map((s) => ({ slot: s, missing: !s.topic }))
                      : [{ text: year.holidays.find((h) => d.date >= h.from && d.date <= h.to)?.label ?? "Χωρίς μάθημα" }],
                  }))
            }
            empty={view === "log" ? "Δεν υπάρχουν μαθήματα που έγιναν σε αυτή την περίοδο." : "Δεν υπάρχουν μαθήματα σε αυτό το διάστημα."}
            subjectName={subjectName}
            className={allClasses ? className : undefined}
            missingText={view === "log" ? "Χωρίς σημείωση" : "Χωρίς θέμα"}
            showPlan={view === "plan"}
          />
        )}
        <p className="mt-4 text-center text-xs text-muted">Με το «Εκτύπωση / PDF» βγαίνει σε σελίδα Α4, με κεφαλίδα σχολείου και υπογραφές.</p>
      </div>

      <div className="hidden overflow-x-auto pb-2 sm:block print:block">
        <article className="paper print-doc mx-auto min-w-[640px] max-w-[820px] bg-white px-8 py-8 text-[12.5px] text-ink shadow-paper">
          <header className="mb-5 border-b-2 border-ink pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">{profile.schoolName || "Σχολείο"}</p>
                <h1 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] leading-tight">{docTitle}</h1>
              </div>
              <p className="text-right text-[11px] leading-snug text-ink-2">
                Σχολικό έτος {year.start.slice(0, 4)}–{year.end.slice(0, 4)}
                <br />
                {docPeriod}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-[11.5px]">
              <div>
                <dt className="text-ink-2">Τμήμα</dt>
                <dd className="font-semibold">{cls ? `${cls.name} · ${cls.grade}` : "Όλα τα τμήματα"}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Μάθημα</dt>
                <dd className="font-semibold">{subjectId ? subjectName(subjectId) : "Όλα"}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Εκπαιδευτικός</dt>
                <dd className="font-semibold">{profile.displayName || "—"}</dd>
              </div>
            </dl>
          </header>

          {loading ? (
            <p className="flex items-center gap-2 py-10 text-muted">
              <Loader2 className="size-4 animate-spin" /> Φόρτωση μαθημάτων της περιόδου…
            </p>
          ) : view === "log" ? (
            log.months.length === 0 ? (
              <p className="py-10 text-center text-muted">Δεν υπάρχουν μαθήματα που έγιναν σε αυτή την περίοδο.</p>
            ) : (
              log.months.map((m, i) => (
                <section key={m.key} className={clsx(i > 0 && "mt-6 break-before-page")}>
                  {log.months.length > 1 && <h2 className="mb-2 text-[13px] font-bold">{m.label}</h2>}
                  <table className="w-full border-collapse text-left align-top">
                    <thead>
                      <tr className="border-y border-ink text-[11px] text-ink-2">
                        <th className="w-[74px] py-1.5 pr-2 font-semibold">Ημερομηνία</th>
                        <th className="w-[46px] py-1.5 pr-2 font-semibold">Ώρα</th>
                        {allClasses && <th className="w-[48px] py-1.5 pr-2 font-semibold">Τμήμα</th>}
                        <th className="w-[110px] py-1.5 pr-2 font-semibold">Μάθημα</th>
                        <th className="py-1.5 pr-2 font-semibold">Διδακτέα ύλη</th>
                        <th className="w-[120px] py-1.5 font-semibold">Παρατηρήσεις</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((r, j) => {
                        const prev = m.rows[j - 1];
                        const prevDate = prev ? (prev.type === "lesson" ? prev.slot.date : prev.date) : "";
                        if (r.type === "break")
                          return (
                            <tr key={`b${r.date}${r.label}`} className="break-inside-avoid border-b border-line">
                              <td className="py-1.5 pr-2 align-top tabular-nums">{shortDate(r.date)}</td>
                              <td colSpan={allClasses ? 5 : 4} className="py-1.5 italic text-ink-2">
                                {r.label}
                              </td>
                            </tr>
                          );
                        const s = r.slot;
                        return (
                          <tr key={s.id} className={clsx("break-inside-avoid border-b border-line", r.missing && "bg-amber-50")}>
                            <td className="py-1.5 pr-2 align-top tabular-nums">
                              {s.date !== prevDate && (
                                <>
                                  {shortDate(s.date)}
                                  <span className="block text-[10.5px] text-ink-2">{dayName(s.date)}</span>
                                </>
                              )}
                            </td>
                            <td className="py-1.5 pr-2 align-top tabular-nums">{s.start}</td>
                            {allClasses && <td className="py-1.5 pr-2 align-top">{className(s.classId)}</td>}
                            <td className="py-1.5 pr-2 align-top">{subjectName(s.subjectId)}</td>
                            <td className="py-1.5 pr-2 align-top">
                              {s.topic && <span className="font-semibold">{s.topic}</span>}
                              {s.topic && s.taughtNote && <br />}
                              {s.taughtNote}
                              {r.missing && !s.topic && !s.taughtNote && <span className="text-ink-2">—</span>}
                            </td>
                            <td className="py-1.5 align-top text-ink-2">{r.remark}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              ))
            )
          ) : (
            <table className="w-full border-collapse text-left align-top">
              <thead>
                <tr className="border-y border-ink text-[11px] text-ink-2">
                  <th className="w-[70px] py-1.5 pr-2 font-semibold">Ημέρα</th>
                  <th className="w-[46px] py-1.5 pr-2 font-semibold">Ώρα</th>
                  {allClasses && <th className="w-[48px] py-1.5 pr-2 font-semibold">Τμήμα</th>}
                  <th className="w-[110px] py-1.5 pr-2 font-semibold">Μάθημα</th>
                  <th className="py-1.5 pr-2 font-semibold">Ενότητα / Θέμα</th>
                  <th className="w-[200px] py-1.5 pr-2 font-semibold">Στόχοι / Δραστηριότητες</th>
                  <th className="w-[110px] py-1.5 font-semibold">Υλικό</th>
                </tr>
              </thead>
              <tbody>
                {plan.days.map((d) => {
                  const holiday = year.holidays.find((h) => d.date >= h.from && d.date <= h.to);
                  return (
                    <Fragment key={d.date}>
                      {d.lessons.length === 0 ? (
                        <tr className="border-b border-line">
                          <td className="py-1.5 pr-2 align-top">
                            {dayName(d.date)}
                            <span className="block text-[10.5px] text-ink-2">{shortDate(d.date)}</span>
                          </td>
                          <td colSpan={allClasses ? 6 : 5} className="py-1.5 italic text-ink-2">
                            {holiday ? holiday.label : "Χωρίς μάθημα"}
                          </td>
                        </tr>
                      ) : (
                        d.lessons.map((s, j) => (
                          <tr key={s.id} className={clsx("break-inside-avoid border-b border-line", !s.topic && "bg-amber-50")}>
                            <td className="py-1.5 pr-2 align-top">
                              {j === 0 && (
                                <>
                                  {dayName(d.date)}
                                  <span className="block text-[10.5px] text-ink-2">{shortDate(d.date)}</span>
                                </>
                              )}
                            </td>
                            <td className="py-1.5 pr-2 align-top tabular-nums">{s.start}</td>
                            {allClasses && <td className="py-1.5 pr-2 align-top">{className(s.classId)}</td>}
                            <td className="py-1.5 pr-2 align-top">{subjectName(s.subjectId)}</td>
                            <td className="py-1.5 pr-2 align-top font-semibold">{s.topic || <span className="font-normal text-ink-2">—</span>}</td>
                            <td className="py-1.5 pr-2 align-top">
                              <GrowingTextarea
                                value={s.plan ?? ""}
                                onChange={(e) => updateSlot(s.id, { plan: e.target.value.slice(0, 2000) })}
                                placeholder="Στόχοι…"
                                aria-label={`Στόχοι: ${dayName(s.date)} ${s.start}`}
                                rows={1}
                                className="no-print -mx-1 block w-full resize-none rounded bg-transparent px-1 text-[12.5px] leading-snug outline-none placeholder:text-amber hover:bg-line-2 focus:bg-brand-50"
                              />
                              <span className="hidden whitespace-pre-line print:block">{s.plan}</span>
                            </td>
                            <td className="py-1.5 align-top text-ink-2">
                              {s.materialIds
                                .map((id) => materials.find((m) => m.id === id)?.title)
                                .filter(Boolean)
                                .join(", ")}
                            </td>
                          </tr>
                        ))
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          <footer className="mt-10 grid break-inside-avoid grid-cols-2 gap-10 text-[11.5px]">
            <div>
              <p className="text-ink-2">Ο/Η εκπαιδευτικός</p>
              <p className="mt-10 border-t border-ink pt-1">{profile.displayName}</p>
            </div>
            <div>
              <p className="text-ink-2">{view === "log" ? "Θεωρήθηκε" : "Έλαβε γνώση"} · Ο/Η Διευθυντής/ντρια</p>
              <p className="mt-10 border-t border-ink pt-1">&nbsp;</p>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

function MobileList({
  days,
  empty,
  subjectName,
  className,
  missingText,
  showPlan,
}: {
  missingText: string;
  showPlan?: boolean;
  days: { date: string; items: { slot?: LessonSlot; text?: string; remark?: string; missing?: boolean }[] }[];
  empty: string;
  subjectName: (id: string) => string;
  className?: (id: string) => string;
}) {
  if (!days.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="grid gap-4">
      {days.map((d) => (
        <li key={d.date}>
          <p className="mb-1.5 text-[13px] font-bold text-muted">
            {dayName(d.date)} {shortDate(d.date)}
          </p>
          <ul className="grid gap-1.5">
            {d.items.map((it, i) =>
              it.slot ? (
                <li key={it.slot.id}>
                  <Link href={`/lessons/${it.slot.id}`} className={cx("block rounded-xl border px-3 py-2.5", it.missing ? "border-amber-100 bg-amber-50" : "border-line bg-surface")}>
                    <p className="text-[12.5px] font-semibold text-muted">
                      {it.slot.start} · {subjectName(it.slot.subjectId)}
                      {className && ` · ${className(it.slot.classId)}`}
                      {it.remark && <span className="text-amber"> · {it.remark}</span>}
                    </p>
                    {it.slot.topic && <p className="font-semibold">{it.slot.topic}</p>}
                    {showPlan ? it.slot.plan && <p className="text-[14px] text-ink-2">{it.slot.plan}</p> : it.slot.taughtNote && <p className="text-[14px] text-ink-2">{it.slot.taughtNote}</p>}
                    {it.missing && !it.slot.topic && !it.slot.taughtNote && <p className="text-[14px] text-amber">{missingText}</p>}
                  </Link>
                </li>
              ) : (
                <li key={`t${i}`} className="rounded-xl border border-dashed border-line px-3 py-2 text-sm italic text-muted">
                  {it.text}
                </li>
              ),
            )}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** «Στόχοι / Δραστηριότητες»: written by the AI from subject, grade and topic (never names), or by hand. */
function Objectives({
  lessons,
  grade,
  subjectName,
  label,
}: {
  lessons: LessonSlot[];
  grade: (classId: string) => string;
  subjectName: (id: string) => string;
  label: (s: LessonSlot) => string;
}) {
  const updateSlot = useApp((s) => s.updateSlot);
  const setPlans = useApp((s) => s.setPlans);
  const demo = useApp((s) => s.mode) !== "cloud";
  const country = useApp((s) => s.profile.country);
  const [busy, setBusy] = useState(false);
  const withTopic = lessons.filter((s) => s.topic.trim());

  const fill = async () => {
    setBusy(true);
    const r = await aiObjectives(
      withTopic.map((s) => ({ id: s.id, subject: subjectName(s.subjectId), grade: grade(s.classId), topic: s.topic })),
      country,
      demo,
    );
    setBusy(false);
    if (!r.ok) return toast(r.error);
    const undo = setPlans(r.data);
    const n = Object.keys(r.data).length;
    toast(`Στόχοι σε ${n} ${n === 1 ? "μάθημα" : "μαθήματα"} · έλεγξέ τους πριν την εκτύπωση`, { label: "Αναίρεση", run: undo });
  };

  return (
    <div className="mb-4 grid grid-cols-1 gap-2">
      {withTopic.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-brand-100 bg-brand-50 p-4">
          <Sparkles className="size-5 shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {withTopic.length} {withTopic.length === 1 ? "μάθημα χωρίς στόχους" : "μαθήματα χωρίς στόχους"}
            </p>
            <p className="text-sm text-ink-2">Από το μάθημα, την τάξη και το θέμα. Κανένα όνομα μαθητή δεν φεύγει.</p>
          </div>
          <Button onClick={fill} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Συμπλήρωσε στόχους
          </Button>
        </Card>
      )}
      <Gaps
        title="Στόχοι με το χέρι"
        hint="Γράψε στόχους ή δραστηριότητες για όποιο μάθημα θέλεις."
        lessons={lessons}
        label={label}
        placeholder={() => "π.χ. Να συγκρίνουν κλάσματα · παιχνίδι με κάρτες"}
        onSave={(s, text) => updateSlot(s.id, { plan: text })}
        done="Αποθηκεύτηκε"
        tone="plain"
      />
    </div>
  );
}

/** Lessons that need one more line before printing, fillable in place. */
function Gaps({
  title,
  hint,
  lessons,
  label,
  placeholder,
  onSave,
  done,
  tone = "warn",
}: {
  tone?: "warn" | "plain";
  title: string;
  hint: string;
  lessons: LessonSlot[];
  label: (s: LessonSlot) => string;
  placeholder: (s: LessonSlot) => string;
  onSave: (s: LessonSlot, text: string) => void;
  done: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});
  return (
    <Card className={cx("p-4", tone === "warn" && "mb-4 border-amber-100 bg-amber-50")}>
      <div className="flex items-start gap-3">
        {tone === "warn" && <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber" />}
        <div className="min-w-0 flex-1">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-ink-2">{hint}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Κλείσιμο" : "Συμπλήρωση"}
        </Button>
      </div>
      {open && (
        <ul className="mt-3 grid gap-2">
          {lessons.slice(0, 30).map((s) => (
            <li key={s.id} className="rounded-xl bg-surface p-3">
              <p className="mb-1.5 text-[13px] font-semibold text-ink-2">{label(s)}</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (text[s.id] ?? "").trim();
                  if (!v) return;
                  onSave(s, v);
                  toast(done);
                }}
              >
                <input
                  value={text[s.id] ?? ""}
                  onChange={(e) => setText((t) => ({ ...t, [s.id]: e.target.value }))}
                  placeholder={placeholder(s)}
                  maxLength={2000}
                  aria-label={label(s)}
                  className={cx(inputClass, "h-10 min-w-0 flex-1")}
                />
                <Button type="submit" disabled={!(text[s.id] ?? "").trim()} aria-label="Αποθήκευση">
                  <Check className="size-4" />
                </Button>
              </form>
            </li>
          ))}
          {lessons.length > 30 && <li className="text-sm text-ink-2">…και {lessons.length - 30} ακόμη. Συμπλήρωσε αυτά και θα εμφανιστούν τα επόμενα.</li>}
        </ul>
      )}
    </Card>
  );
}

export default function JournalPage() {
  return (
    <Suspense>
      <Journal />
    </Suspense>
  );
}
