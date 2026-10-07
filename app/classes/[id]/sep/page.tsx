"use client";

import clsx from "clsx";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, Printer, Sparkles, Users } from "@/components/icons";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useClock } from "@/components/lesson";
import { PageHeader } from "@/components/shell/PageHeader";
import { GrowingTextarea } from "@/components/text";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card, cx, EmptyState, inputClass, Segmented, Select } from "@/components/ui";
import { aiSep, type SepRequest } from "@/lib/ai/client";
import { shortDate } from "@/lib/dates";
import { schoolYearStart, yearFor } from "@/lib/schoolYear";
import {
  absentDays,
  ACHIEVEMENT,
  AREA_GROUP_LABEL,
  AREAS,
  FREQUENCY,
  guessGender,
  progress,
  reportKey,
  SKILL_GROUPS,
  SKILLS,
  stars,
  termFor,
  termRange,
  type ProgressReport,
  type Rating,
  type ReportTexts,
  type Term,
  type TextKey,
} from "@/lib/sep";
import { useApp } from "@/lib/store";
import { remote } from "@/lib/store/remote";
import { useReports } from "@/lib/store/reports";
import type { AttendanceRecord, ClassGroup, Student } from "@/lib/types";

type Tab = "skills" | "learning" | "texts";
const CORE_AREAS = AREAS.filter((a) => a.group).map((a) => a.id);
const fullName = (s: Student) => `${s.firstName} ${s.lastName}`.trim();
const TERM_LABEL: Record<Term, string> = { 1: "Α΄ τετράμηνο", 2: "Β΄ τετράμηνο" };

/** A class's attendance for a τετράμηνο: from memory, or from the account for older months. */
function useTermAttendance(classId: string, from: string, to: string) {
  const mode = useApp((s) => s.mode);
  const local = useApp((s) => s.attendance);
  const [fetched, setFetched] = useState<Record<string, AttendanceRecord>>();
  useEffect(() => {
    if (mode !== "cloud") return;
    let live = true;
    remote
      .fetchAttendance(classId, from, to)
      .then((r) => live && setFetched(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mode, classId, from, to]);
  return useMemo(() => ({ ...fetched, ...local }), [fetched, local]);
}

/** Four ★ buttons on the Ministry's scale; tapping the chosen one clears it. */
function Stars({ value, onChange, scale, label }: { value?: Rating; onChange: (r?: Rating) => void; scale: Record<Rating, string>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid shrink-0 grid-cols-4 gap-1">
      {([1, 2, 3, 4] as Rating[]).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={scale[n]}
          title={scale[n]}
          onClick={() => onChange(value === n ? undefined : n)}
          className={cx(
            "flex h-11 min-w-11 items-center justify-center rounded-lg border px-1.5 text-[12px] leading-none tracking-[-0.08em] transition-colors sm:min-w-14",
            value === n ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-surface text-amber hover:bg-line-2",
          )}
        >
          {"★".repeat(n)}
        </button>
      ))}
    </div>
  );
}

function Row({ label, hints, children }: { label: string; hints?: string[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex flex-col gap-2 border-b border-line-2 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        {hints ? (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-left text-[15px] font-medium hover:text-brand-700">
            {label}
          </button>
        ) : (
          <p className="text-[15px] font-medium">{label}</p>
        )}
        {open && hints && (
          <ul className="mt-1.5 grid gap-0.5 text-[13px] text-muted">
            {hints.map((h) => (
              <li key={h}>· {h}</li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </li>
  );
}

function Legend({ scale }: { scale: Record<Rating, string> }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
      {([4, 3, 2, 1] as Rating[]).map((n) => (
        <span key={n}>
          <span className="text-amber">{"★".repeat(n)}</span> {scale[n]}
        </span>
      ))}
    </p>
  );
}

const TEXT_FIELDS: { key: TextKey; label: string; placeholder: string }[] = [
  { key: "greek.strengths", label: "Ελληνικά · Δυνατά σημεία", placeholder: "π.χ. Διαβάζει με άνεση και κατανοεί κείμενα της ηλικίας του." },
  { key: "greek.growth", label: "Ελληνικά · Περιοχές ανάπτυξης", placeholder: "π.χ. Θα ωφεληθεί από εξάσκηση στη γραπτή έκφραση." },
  { key: "maths.strengths", label: "Μαθηματικά · Δυνατά σημεία", placeholder: "π.χ. Λύνει με ευχέρεια προβλήματα με κλάσματα." },
  { key: "maths.growth", label: "Μαθηματικά · Περιοχές ανάπτυξης", placeholder: "π.χ. Χρειάζεται εξάσκηση στη μέτρηση." },
  { key: "other.strengths", label: "Άλλα μαθήματα · Δυνατά σημεία", placeholder: "Προαιρετικά" },
  { key: "other.growth", label: "Άλλα μαθήματα · Περιοχές ανάπτυξης", placeholder: "Προαιρετικά" },
  { key: "remarks", label: "Δεξιότητες / συμπεριφορές · Παρατηρήσεις", placeholder: "π.χ. Συνεργάζεται πρόθυμα και σέβεται τους συμμαθητές του." },
];

function Texts({ cls, student, report, year, term, absent }: { cls: ClassGroup; student: Student; report?: ProgressReport; year: number; term: Term; absent: number }) {
  const setTexts = useReports((s) => s.setTexts);
  const setReviewed = useReports((s) => s.setReviewed);
  const demo = useApp((s) => s.mode) !== "cloud";
  const [busy, setBusy] = useState(false);
  const texts = report?.texts ?? {};
  const gender = texts.gender ?? guessGender(student.firstName);
  const excused = Math.min(texts.excused ?? absent, absent);
  const rated = Object.keys(report?.ratings ?? {}).length;

  const draft = async () => {
    const ratings: SepRequest["ratings"] = [
      ...SKILLS.filter((s) => report?.ratings[s.id]).map((s) => ({ label: s.label, value: FREQUENCY[report!.ratings[s.id]], stars: report!.ratings[s.id], group: "skill" as const })),
      ...AREAS.filter((a) => report?.ratings[a.id]).map((a) => ({
        label: a.group ? `${AREA_GROUP_LABEL[a.group]} · ${a.label}` : a.label,
        value: ACHIEVEMENT[report!.ratings[a.id]],
        stars: report!.ratings[a.id],
        group: a.group ?? ("other" as const),
      })),
    ];
    const before: Partial<ReportTexts> = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, texts[f.key] ?? ""]));
    setBusy(true);
    const r = await aiSep({ grade: cls.grade, term, gender, ratings }, demo);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    // Only empty fields are written: the teacher's own words are never overwritten.
    const patch = Object.fromEntries(Object.entries(r.data).filter(([k]) => !texts[k as TextKey]?.trim()));
    if (!Object.keys(patch).length) return toast("Τα πεδία έχουν ήδη κείμενο· άδειασε όποιο θέλεις να ξαναγραφτεί.");
    setTexts(student.id, year, term, { ...patch, draft: true }, false);
    toast("Προσχέδια έτοιμα · διάβασέ τα και πάτησε «Τα έλεγξα»", {
      label: "Αναίρεση",
      run: () => setTexts(student.id, year, term, { ...before, draft: false }),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="grid grid-cols-1 gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold">✨ Προσχέδια από τις βαθμίδες</p>
            <p className="text-sm text-ink-2">Στέλνονται μόνο οι ★, η τάξη και το γένος για τη γραμματική. Ποτέ το όνομα ή οι σημειώσεις σου.</p>
          </div>
          <Segmented<"m" | "f">
            value={gender}
            onChange={(g) => setTexts(student.id, year, term, { gender: g })}
            size="sm"
            className="w-44"
            options={[
              { value: "m", label: "Αγόρι" },
              { value: "f", label: "Κορίτσι" },
            ]}
          />
        </div>
        <Button onClick={draft} disabled={busy || !rated} className="w-full sm:w-auto sm:justify-self-start">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Γράψε προσχέδια
        </Button>
        {!rated && <p className="text-[13px] text-muted">Βάλε πρώτα ★ στις δεξιότητες ή στη μάθηση.</p>}
      </Card>

      {texts.draft && !report?.reviewed && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-ink-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" /> Προσχέδιο AI. Διάβασέ το, διόρθωσε ό,τι δεν ταιριάζει στο παιδί και πάτησε «Τα έλεγξα».
        </p>
      )}

      <Card className="grid grid-cols-1 gap-4 p-4">
        {TEXT_FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">{f.label}</span>
            <GrowingTextarea
              value={texts[f.key] ?? ""}
              onChange={(e) => setTexts(student.id, year, term, { [f.key]: e.target.value.slice(0, 1200) })}
              placeholder={f.placeholder}
              rows={2}
              className={cx(inputClass, "resize-none py-2.5 leading-relaxed")}
            />
          </label>
        ))}
      </Card>

      <Card className="grid grid-cols-1 gap-3 p-4">
        <p className="font-bold">Απουσίες · {TERM_LABEL[term]}</p>
        <p className="text-sm text-ink-2">
          {absent === 0 ? "Καμία απουσία στις παρουσίες που πήρες." : `${absent} ${absent === 1 ? "μέρα" : "μέρες"} από τις παρουσίες. Όρισε πόσες ήταν δικαιολογημένες.`}
        </p>
        {absent > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              Δικαιολογημένες
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={absent}
                value={excused}
                onChange={(e) => setTexts(student.id, year, term, { excused: Math.max(0, Math.min(absent, Math.round(Number(e.target.value) || 0))) })}
                className={cx(inputClass, "!w-20 shrink-0 text-center")}
              />
            </label>
            <span>
              Αδικαιολόγητες: <b>{absent - excused}</b>
            </span>
          </div>
        )}
      </Card>

      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <input type="checkbox" checked={!!report?.reviewed} onChange={(e) => setReviewed(student.id, year, term, e.target.checked)} className="size-5 accent-brand-500" />
        <span>
          <span className="block font-semibold">Τα έλεγξα</span>
          <span className="text-sm text-muted">Η έκθεση του παιδιού είναι έτοιμη για εκτύπωση.</span>
        </span>
      </label>
    </div>
  );
}

/** One child's ΣΕΠ laid out like the Ministry's form (ΥΠΑΝ ΔΔΕ Π12), both τετράμηνα side by side. */
function PrintedReport({
  student,
  cls,
  school,
  teacher,
  yearLabel,
  term,
  reports,
  absences,
}: {
  student: Student;
  cls: ClassGroup;
  school: string;
  teacher: string;
  yearLabel: string;
  term: Term;
  reports: Record<Term, ProgressReport | undefined>;
  absences: Record<Term, number>;
}) {
  const texts = reports[term]?.texts ?? {};
  const cell = "border border-ink/60 px-1.5 py-1 align-top";
  const starCell = `${cell} w-[62px] text-center text-[11px] tracking-[-0.08em]`;
  const others = AREAS.filter((a) => !a.group);
  const groupRows = (g: "greek" | "maths") => AREAS.filter((a) => a.group === g);
  const textCells = (g: "greek" | "maths" | "other", span: number) => (
    <>
      <td rowSpan={span} className={`${cell} w-[150px] text-[10.5px] leading-snug`}>
        {texts[`${g}.strengths`]}
      </td>
      <td rowSpan={span} className={`${cell} w-[150px] text-[10.5px] leading-snug`}>
        {texts[`${g}.growth`]}
      </td>
    </>
  );
  const excused = (t: Term) => Math.min(reports[t]?.texts.excused ?? absences[t], absences[t]);

  return (
    <section className="paper break-after-page bg-white text-[11.5px] text-ink">
      <header className="mb-3 text-center">
        <p className="text-left text-[11px]">ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ: {school || "……………………"}</p>
        <p className="text-left text-[11px] font-semibold">ΣΧΟΛΙΚΗ ΧΡΟΝΙΑ: {yearLabel}</p>
        <h1 className="mt-2 text-[15px] font-bold tracking-wide">ΣΧΟΛΙΚΗ ΕΚΘΕΣΗ ΠΡΟΟΔΟΥ ΔΗΜΟΤΙΚΟΥ ΣΧΟΛΕΙΟΥ</h1>
      </header>
      <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5px]">
        <div className="col-span-2 flex gap-1">
          <dt>Ονοματεπώνυμο παιδιού:</dt>
          <dd className="font-semibold">{fullName(student)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Ημερομηνία γέννησης:</dt>
          <dd className="flex-1 border-b border-dotted border-ink/60" />
        </div>
        <div className="flex gap-1">
          <dt>Τάξη:</dt>
          <dd className="font-semibold">{cls.grade || cls.name}</dd>
        </div>
        <div className="col-span-2 flex gap-1">
          <dt>Εκπαιδευτικός τάξης:</dt>
          <dd className="font-semibold">{teacher}</dd>
        </div>
      </dl>

      <table className="w-full border-collapse">
        <tbody>
          {SKILL_GROUPS.map((g) => (
            <Fragment key={g.id}>
              <tr className="bg-line-2 text-[10.5px] font-bold uppercase">
                <td className={cell}>{g.title}</td>
                <td className={`${cell} text-center`}>Α΄ ΤΕΤΡΑΜ.</td>
                <td className={`${cell} text-center`}>Β΄ ΤΕΤΡΑΜ.</td>
              </tr>
              {g.skills.map((s) => (
                <tr key={s.id} className="break-inside-avoid">
                  <td className={cell}>{s.label}</td>
                  <td className={starCell}>{stars(reports[1]?.ratings[s.id])}</td>
                  <td className={starCell}>{stars(reports[2]?.ratings[s.id])}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      {texts.remarks && (
        <p className="mt-1.5 text-[11px]">
          <b>Παρατηρήσεις–Σχόλια:</b> {texts.remarks}
        </p>
      )}
      <p className="mt-1 text-[10px] text-ink-2">★★★★ Τις περισσότερες φορές · ★★★ Συχνά · ★★ Μερικές φορές · ★ Σπάνια</p>

      <table className="mt-4 w-full break-before-page border-collapse">
        <thead>
          <tr className="bg-line-2 text-[10.5px] font-bold">
            <th className={`${cell} text-left`}>Περιοχή μάθησης</th>
            <th className={`${cell} text-center`}>Α΄ ΤΕΤΡΑΜ.</th>
            <th className={`${cell} text-center`}>Β΄ ΤΕΤΡΑΜ.</th>
            <th className={`${cell} text-left`}>Δυνατά σημεία του παιδιού</th>
            <th className={`${cell} text-left`}>Περιοχές ανάπτυξης</th>
          </tr>
        </thead>
        <tbody>
          {(["greek", "maths"] as const).map((g) => (
            <Fragment key={g}>
              <tr className="break-inside-avoid">
                <td className={`${cell} font-bold uppercase`} colSpan={3}>
                  {AREA_GROUP_LABEL[g]}
                </td>
                {textCells(g, groupRows(g).length + 1)}
              </tr>
              {groupRows(g).map((a) => (
                <tr key={a.id}>
                  <td className={cell}>{a.label}</td>
                  <td className={starCell}>{stars(reports[1]?.ratings[a.id])}</td>
                  <td className={starCell}>{stars(reports[2]?.ratings[a.id])}</td>
                </tr>
              ))}
            </Fragment>
          ))}
          {others.map((a, i) => (
            <tr key={a.id}>
              <td className={`${cell} font-semibold`}>{a.label}</td>
              <td className={starCell}>{stars(reports[1]?.ratings[a.id])}</td>
              <td className={starCell}>{stars(reports[2]?.ratings[a.id])}</td>
              {i === 0 && textCells("other", others.length)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-ink-2">
        Τα επιδιωκόμενα αποτελέσματα, σύμφωνα με το ΑΠ: ★★★★ έχουν επιτευχθεί πλήρως · ★★★ επαρκώς · ★★ μερικώς · ★ δεν έχουν επιτευχθεί ικανοποιητικά
      </p>

      <table className="mt-4 w-full break-inside-avoid border-collapse text-[11px]">
        <tbody>
          {([1, 2] as Term[]).map((t) => (
            <tr key={t}>
              <td className={`${cell} font-semibold`}>ΑΠΟΥΣΙΕΣ {t === 1 ? "Α΄" : "Β΄"} τετράμηνο</td>
              <td className={cell}>Δικαιολογημένες: {t <= term ? `${excused(t)} μέρες` : "……… μέρες"}</td>
              <td className={cell}>Αδικαιολόγητες: {t <= term ? `${absences[t] - excused(t)} μέρες` : "……… μέρες"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="mt-6 grid break-inside-avoid grid-cols-3 gap-6 text-[11px]">
        <p>ΗΜΕΡΟΜΗΝΙΑ: ……………………</p>
        <div>
          <p className="text-ink-2">Δάσκαλος/α τάξης</p>
          <p className="mt-8 border-t border-ink pt-1">{teacher}</p>
        </div>
        <div>
          <p className="text-ink-2">Διευθυντής/ντρια</p>
          <p className="mt-8 border-t border-ink pt-1">&nbsp;</p>
        </div>
      </footer>
    </section>
  );
}

function Report() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const clock = useClock();
  const cls = useApp((s) => s.classes.find((c) => c.id === id));
  const students = useApp((s) => s.students);
  const profile = useApp((s) => s.profile);
  const mode = useApp((s) => s.mode);
  const roster = useMemo(() => students.filter((s) => s.classId === id), [students, id]);
  const reports = useReports((s) => s.reports);
  const saved = useReports((s) => s.saved);
  const rate = useReports((s) => s.rate);
  const fill = useReports((s) => s.fill);
  const [printAll, setPrintAll] = useState(false);

  const yearInfo = yearFor(profile.country, clock.today);
  const year = schoolYearStart(clock.today);
  const term: Term = params.get("term") === "2" ? 2 : params.get("term") === "1" ? 1 : termFor(yearInfo, clock.today);
  const tab: Tab = (["skills", "learning", "texts"] as const).find((t) => t === params.get("tab")) ?? "skills";
  const student = roster.find((s) => s.id === params.get("s")) ?? roster[0];
  const range1 = termRange(yearInfo, 1);
  const range2 = termRange(yearInfo, 2);
  const attendance = useTermAttendance(id, range1.from, clock.today < range2.to ? clock.today : range2.to);
  const absences = (sid: string): Record<Term, number> => ({
    1: absentDays(attendance, id, sid, range1.from, range1.to),
    2: absentDays(attendance, id, sid, range2.from, range2.to),
  });

  const set = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`/classes/${id}/sep?${q}`, { scroll: false });
  };

  useEffect(() => {
    const done = () => setPrintAll(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);
  const print = (all: boolean) => {
    setPrintAll(all);
    setTimeout(() => window.print(), 50);
  };

  if (!cls) return <EmptyState icon={<Users className="size-6" />} title="Το τμήμα δεν βρέθηκε" action={<ButtonLink href="/classes">Οι τάξεις μου</ButtonLink>} />;
  if (!student)
    return (
      <EmptyState
        icon={<Users className="size-6" />}
        title="Δεν υπάρχουν μαθητές στο τμήμα"
        text="Πρόσθεσε μαθητές και η Σχολική Έκθεση Προόδου θα είναι έτοιμη για συμπλήρωση."
        action={<ButtonLink href={`/classes/${id}?tab=students`}>Μαθητές</ButtonLink>}
      />
    );

  const report = reports[reportKey(student.id, year, term)];
  const idx = roster.indexOf(student);
  const ids = tab === "learning" ? AREAS.map((a) => a.id) : SKILLS.map((s) => s.id);
  const readyCount = roster.filter((s) => reports[reportKey(s.id, year, term)]?.reviewed).length;
  const yearLabel = `${year}–${year + 1}`;

  const fillClass = () => {
    const r = fill(
      roster.map((s) => s.id),
      year,
      term,
      tab === "learning" ? CORE_AREAS : SKILLS.map((s) => s.id),
      3,
    );
    if (!r.count) return toast("Όλα έχουν ήδη βαθμίδα.");
    toast(`★★★ σε ${r.count} κενά · άλλαξε μόνο τις εξαιρέσεις`, { label: "Αναίρεση", run: r.undo });
  };

  const printed = (s: Student) => (
    <PrintedReport
      key={s.id}
      student={s}
      cls={cls}
      school={profile.schoolName}
      teacher={profile.displayName}
      yearLabel={yearLabel}
      term={term}
      reports={{ 1: reports[reportKey(s.id, year, 1)], 2: reports[reportKey(s.id, year, 2)] }}
      absences={absences(s.id)}
    />
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print">
        <PageHeader
          back={`/classes/${id}?tab=progress`}
          title="Σχολική Έκθεση Προόδου"
          subtitle={`${cls.name} · ${yearLabel} · ${readyCount} από ${roster.length} έτοιμες`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => print(true)}>
                <Printer className="size-4" /> Όλη η τάξη
              </Button>
              <Button onClick={() => print(false)}>
                <Printer className="size-4" /> Εκτύπωση / PDF
              </Button>
            </div>
          }
        />
        {mode === "cloud" && saved === false && (
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-ink-2">Οι εκθέσεις φυλάσσονται προς το παρόν σε αυτή τη συσκευή· θα περάσουν στον λογαριασμό σου αυτόματα.</p>
        )}

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
          <Segmented<"1" | "2">
            value={String(term) as "1" | "2"}
            onChange={(t) => set({ term: t })}
            size="sm"
            className="sm:w-72"
            options={[
              { value: "1", label: TERM_LABEL[1] },
              { value: "2", label: TERM_LABEL[2] },
            ]}
          />
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Προηγούμενο παιδί"
              disabled={idx <= 0}
              onClick={() => set({ s: roster[idx - 1].id })}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface hover:bg-line-2 disabled:opacity-40"
            >
              <ChevronLeft className="size-5" />
            </button>
            <Select value={student.id} onChange={(e) => set({ s: e.target.value })} aria-label="Παιδί" className="min-w-0 flex-1">
              {roster.map((s) => {
                const r = reports[reportKey(s.id, year, term)];
                const p = progress(r, CORE_AREAS);
                return (
                  <option key={s.id} value={s.id}>
                    {fullName(s)} · {r?.reviewed ? "✓ έτοιμη" : `${p.done}/${p.total}`}
                  </option>
                );
              })}
            </Select>
            <button
              type="button"
              aria-label="Επόμενο παιδί"
              disabled={idx >= roster.length - 1}
              onClick={() => set({ s: roster[idx + 1].id })}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface hover:bg-line-2 disabled:opacity-40"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <Segmented<Tab>
          value={tab}
          onChange={(t) => set({ tab: t })}
          className="mb-4"
          options={[
            { value: "skills", label: "Δεξιότητες" },
            { value: "learning", label: "Μάθηση" },
            { value: "texts", label: "Σχόλια" },
          ]}
        />

        {tab !== "texts" ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Legend scale={tab === "skills" ? FREQUENCY : ACHIEVEMENT} />
              <Button variant="soft" size="sm" onClick={fillClass}>
                Όλη η τάξη ★★★ όπου λείπει
              </Button>
            </div>
            {tab === "skills"
              ? SKILL_GROUPS.map((g) => (
                  <Card key={g.id} className="px-4 py-2">
                    <h2 className="pt-2 text-[13px] font-bold uppercase tracking-wide text-muted">{g.title}</h2>
                    <ul>
                      {g.skills.map((s) => (
                        <Row key={s.id} label={s.label} hints={s.hints}>
                          <Stars label={s.label} scale={FREQUENCY} value={report?.ratings[s.id]} onChange={(r) => rate(student.id, year, term, s.id, r)} />
                        </Row>
                      ))}
                    </ul>
                  </Card>
                ))
              : (
                  [
                    { title: "Ελληνικά", list: AREAS.filter((a) => a.group === "greek") },
                    { title: "Μαθηματικά", list: AREAS.filter((a) => a.group === "maths") },
                    { title: "Άλλα μαθήματα · όσα διδάσκεις", list: AREAS.filter((a) => !a.group) },
                  ] as const
                ).map((g) => (
                  <Card key={g.title} className="px-4 py-2">
                    <h2 className="pt-2 text-[13px] font-bold uppercase tracking-wide text-muted">{g.title}</h2>
                    <ul>
                      {g.list.map((a) => (
                        <Row key={a.id} label={a.label}>
                          <Stars label={a.label} scale={ACHIEVEMENT} value={report?.ratings[a.id]} onChange={(r) => rate(student.id, year, term, a.id, r)} />
                        </Row>
                      ))}
                    </ul>
                  </Card>
                ))}
            <div className="flex items-center justify-between gap-2 text-sm text-muted">
              <span>
                {ids.filter((x) => report?.ratings[x]).length} από {ids.length} με βαθμίδα
              </span>
              {idx < roster.length - 1 ? (
                <Button variant="secondary" size="sm" onClick={() => set({ s: roster[idx + 1].id })}>
                  Επόμενο παιδί <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => set({ tab: tab === "skills" ? "learning" : "texts", s: roster[0].id })}>
                  {tab === "skills" ? "Στη μάθηση" : "Στα σχόλια"} <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Texts key={`${student.id}${term}`} cls={cls} student={student} report={report} year={year} term={term} absent={absences(student.id)[term]} />
        )}

        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
          <Check className="size-3.5" /> Μορφή εντύπου ΥΠΑΝ ΔΔΕ Π12 · απουσίες από τις παρουσίες ως {shortDate(clock.today)}
        </p>
      </div>

      <div className="hidden print:block">
        <div className={clsx("print-doc")}>{printAll ? roster.map(printed) : printed(student)}</div>
      </div>
    </div>
  );
}

export default function SepPage() {
  return (
    <Suspense>
      <Report />
    </Suspense>
  );
}
