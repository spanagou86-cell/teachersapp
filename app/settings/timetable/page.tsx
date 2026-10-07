"use client";

import clsx from "clsx";
import { AlertTriangle, CalendarPlus, Camera, Coffee, Loader2, MessagesSquare, Plus, ShieldCheck, Trash2 } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { DUTY_PLACES, openDutySheet } from "@/components/dutySheet";
import { SUBJECT_STYLE } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, Card, cx, Field, IconButton, inputClass, Segmented, Select, Sheet } from "@/components/ui";
import { uid } from "@/lib/id";
import { dutyLabel, yearFor } from "@/lib/schoolYear";
import { aiReadTimetable, shrinkImage, toBase64 } from "@/lib/ai/client";
import { enablePush, pushState } from "@/lib/pushClient";
import { gradeFromName, planImport } from "@/lib/ai/timetableImport";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { BELLS, isValidTime, kindLabel, overlappingEntries, PERIOD_MINUTES, periodsFrom, type Period } from "@/lib/timetable";
import { shortDate, timeToMin } from "@/lib/dates";
import type { SubjectId, TimetableEntry } from "@/lib/types";
import { subjectChoices } from "@/lib/subjects";

const DAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];
const DAYS_SHORT = ["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ"];

type Kind = TimetableEntry["kind"] | "none";
interface Cell {
  id?: string;
  kind: TimetableEntry["kind"];
  classId?: string;
  subjectId?: SubjectId;
  label: string;
}
interface Row extends Period {
  key: string;
}

function CellView({ cell, onClick, label }: { cell?: Cell; onClick: () => void; label: string }) {
  const country = useApp((s) => s.profile.country);
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const base = "flex h-14 w-full flex-col items-start justify-center rounded-lg border px-2 text-left text-xs leading-tight transition hover:shadow-pop";
  if (!cell)
    return (
      <button type="button" aria-label={`${label}: κενό κελί`} onClick={onClick} className={clsx(base, "items-center border-dashed border-line text-muted hover:bg-line-2")}>
        <Plus className="size-4" />
      </button>
    );
  if (cell.kind === "lesson") {
    const st = SUBJECT_STYLE[cell.subjectId ?? "allo"];
    return (
      <button type="button" aria-label={label} onClick={onClick} className={clsx(base, "border-line bg-surface")}>
        <span className="flex w-full items-center gap-1.5">
          <span className={clsx("h-3 w-1 rounded-full", st.bar)} />
          <span className="truncate font-bold">{subjects.find((s) => s.id === cell.subjectId)?.name}</span>
        </span>
        <span className="mt-0.5 text-muted">{classes.find((c) => c.id === cell.classId)?.name}</span>
      </button>
    );
  }
  const map = {
    duty: { cls: "border-amber-100 bg-amber-50", Icon: ShieldCheck, icon: "text-amber" },
    free: { cls: "border-dashed border-line bg-line-2/60", Icon: Coffee, icon: "text-muted" },
    meeting: { cls: "border-info-50 bg-info-50", Icon: MessagesSquare, icon: "text-info" },
  }[cell.kind];
  return (
    <button type="button" aria-label={label} onClick={onClick} className={clsx(base, map.cls)}>
      <span className="flex items-center gap-1 font-bold">
        <map.Icon className={clsx("size-3.5", map.icon)} /> {kindLabel(cell.kind, country)}
      </span>
      {cell.label && <span className="mt-0.5 truncate text-muted">{cell.label}</span>}
    </button>
  );
}

function CellEditor({
  open,
  title,
  cell,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  cell?: Cell;
  onClose: () => void;
  onSave: (c: Cell | undefined) => void;
}) {
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const country = useApp((s) => s.profile.country);
  const [kind, setKind] = useState<Kind>(cell?.kind ?? "lesson");
  const [classId, setClassId] = useState(cell?.classId ?? classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState<SubjectId>(cell?.subjectId ?? "glossa");
  const [label, setLabel] = useState(cell?.label ?? "");
  const lessonInvalid = kind === "lesson" && !classId;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button
          className="w-full"
          disabled={lessonInvalid}
          onClick={() =>
            onSave(
              kind === "none"
                ? undefined
                : { id: cell?.id, kind, classId: kind === "lesson" ? classId : undefined, subjectId: kind === "lesson" ? subjectId : undefined, label: kind === "lesson" ? "" : label.trim() },
            )
          }
        >
          Εντάξει
        </Button>
      }
    >
      <Segmented<Kind>
        value={kind}
        onChange={setKind}
        size="sm"
        options={[
          { value: "lesson", label: "Μάθημα" },
          { value: "duty", label: dutyLabel(country) },
          { value: "free", label: "Κενό" },
          { value: "meeting", label: "Σύσκεψη" },
          { value: "none", label: "Τίποτα" },
        ]}
      />
      <div className="mt-4 space-y-3">
        {kind === "lesson" &&
          (classes.length ? (
            <>
              <Field label="Τμήμα">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.grade}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Μάθημα">
                <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value as SubjectId)}>
                  {subjectChoices(subjects, subjectId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : (
            <p className="text-sm text-danger">Πρόσθεσε πρώτα ένα τμήμα από τις «Οι τάξεις μου».</p>
          ))}
        {(kind === "duty" || kind === "meeting") && (
          <Field label={kind === "duty" ? "Σημείο" : "Θέμα (προαιρετικό)"}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={kind === "duty" ? "π.χ. Αυλή" : "π.χ. Σύλλογος διδασκόντων"} className={cx(inputClass, "h-10")} />
            {kind === "duty" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DUTY_PLACES.map((p) => (
                  <button key={p} type="button" onClick={() => setLabel(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-line-2">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        {kind === "free" && <p className="text-sm text-muted">Τα κενά σου φαίνονται στο «Σήμερα» και προτείνονται πρώτα όταν μεταφέρεις ένα μάθημα.</p>}
      </div>
    </Sheet>
  );
}

const ORDINAL = ["1ο", "2ο", "3ο", "4ο", "5ο"];

/** «Παιδονομία: πότε έχεις;» — days × breaks, one tap each, so reminders know when to ring. */
function DutyPicker({
  breaks,
  isOn,
  onToggle,
  onDay,
  onAdd,
  extra,
  dayEnd,
  place,
  setPlace,
}: {
  breaks: Period[];
  /** The last bell: nothing happens at school after it. */
  dayEnd: string;
  /** Other weekly duty times the teacher added (after school, a lunch break…). */
  extra: Period[];
  onAdd: (days: number[], p: Period) => void;
  isOn: (day: number, b: Period) => boolean;
  onToggle: (day: number, b: Period) => void;
  onDay: (day: number) => void;
  place: string;
  setPlace: (p: string) => void;
}) {
  const country = useApp((s) => s.profile.country);
  const duty = dutyLabel(country);
  const count = [...breaks, ...extra].reduce((n, b) => n + [1, 2, 3, 4, 5].filter((d) => isOn(d, b)).length, 0);
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const filled = isValidTime(from) && isValidTime(to);
  // Only within the school day: from the morning duty to the last bell.
  const inDay = filled && timeToMin(from) >= timeToMin(breaks[0]?.start ?? "00:00") && timeToMin(to) <= timeToMin(dayEnd);
  const okTime = filled && timeToMin(to) > timeToMin(from) && inDay;
  if (!breaks.length) return null;
  return (
    <Card className="mb-5 grid grid-cols-1 gap-3 border-amber-100 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
            {duty}: πότε έχεις;
            {count > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber">{count} τη βδομάδα</span>}
          </h2>
          <p className="text-sm text-muted">
            Συνήθως είναι μία μέρα τη βδομάδα: πάτα τη <b className="text-ink-2">μέρα</b> και μπαίνουν η πρωινή και όλα τα διαλείμματα. Θα σε ειδοποιώ 5′ πριν από
            καθεμιά.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1" role="grid" aria-label={`${duty} ανά μέρα και διάλειμμα`}>
          <thead>
            <tr>
              <th className="w-[84px]" />
              {DAYS_SHORT.map((d, i) => {
                const all = breaks.every((b) => isOn(i + 1, b));
                return (
                  <th key={d}>
                    <button
                      type="button"
                      aria-pressed={all}
                      aria-label={`Όλη τη μέρα: ${DAYS[i]}`}
                      onClick={() => onDay(i + 1)}
                      className={clsx(
                        "h-9 w-full min-w-10 rounded-lg border text-[11px] font-bold transition-colors",
                        all ? "border-amber bg-amber-50 text-amber" : "border-line bg-surface text-ink-2 hover:bg-amber-50",
                      )}
                    >
                      {d}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...breaks, ...extra].map((b, i) => (
              <tr key={`${b.start}-${b.end}`}>
                <td className="pr-1 text-left">
                  <span className="block text-[12.5px] font-semibold leading-tight">
                    {i === 0 ? "Πρωινή" : i < breaks.length ? `${ORDINAL[i - 1] ?? `${i}ο`} διάλειμμα` : "Άλλη ώρα"}
                  </span>
                  <span className="block text-[11.5px] tabular-nums text-muted">
                    {b.start}–{b.end}
                  </span>
                </td>
                {[1, 2, 3, 4, 5].map((day) => {
                  const on = isOn(day, b);
                  return (
                    <td key={day}>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${duty} ${DAYS[day - 1]} ${b.start}`}
                        onClick={() => onToggle(day, b)}
                        className={clsx(
                          "flex h-11 w-full min-w-10 items-center justify-center rounded-lg border transition-colors",
                          on ? "border-amber bg-amber text-white" : "border-line bg-surface text-line hover:bg-amber-50",
                        )}
                      >
                        <ShieldCheck className="size-4" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding ? (
        <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-line bg-bg p-3">
          <p className="text-sm font-semibold">Άλλη ώρα, κάθε εβδομάδα</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Από" className={cx(inputClass, "h-10 !w-28")} />
            <span className="text-muted">–</span>
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Έως" className={cx(inputClass, "h-10 !w-28", filled && !okTime && "border-danger")} />
          </div>
          <p className={cx("text-[13px]", filled && !okTime ? "text-danger" : "text-muted")}>
            {filled && !inDay ? `Μόνο μέσα στο σχολικό ωράριο: ${breaks[0]?.start}–${dayEnd}.` : `Μέσα στο σχολικό ωράριο, ${breaks[0]?.start}–${dayEnd}.`}
          </p>
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Μέρες">
            {DAYS_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={days.includes(i + 1)}
                onClick={() => setDays((ds) => (ds.includes(i + 1) ? ds.filter((x) => x !== i + 1) : [...ds, i + 1]))}
                className={clsx("h-10 rounded-lg border text-[12px] font-bold", days.includes(i + 1) ? "border-amber bg-amber text-white" : "border-line bg-surface text-ink-2")}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!okTime || !days.length}
              onClick={() => {
                onAdd(days, { start: from, end: to });
                setAdding(false);
                setDays([]);
              }}
            >
              Προσθήκη
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Άκυρο
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Άλλη ώρα κάθε εβδομάδα
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openDutySheet()}>
            <CalendarPlus className="size-4" /> Μία φορά (π.χ. αντικατάσταση)
          </Button>
        </div>
      )}
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Σημείο (προαιρετικό):</span>
        <Select value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Σημείο" className="!h-9 w-auto min-w-36">
          <option value="">—</option>
          {DUTY_PLACES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </label>
    </Card>
  );
}

function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const country = useApp((s) => s.profile.country);
  const timetable = useApp((s) => s.timetable);
  const today = useApp((s) => s.today);
  const mode = useApp((s) => s.mode);
  const saveTimetable = useApp((s) => s.saveTimetable);
  const allClasses = useApp((s) => s.classes);
  const addClass = useApp((s) => s.addClass);
  const teacher = useApp((s) => s.profile.displayName);
  const photoRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [readNotes, setReadNotes] = useState("");

  const initialRows = useMemo<Row[]>(
    () => (timetable.length ? periodsFrom(timetable) : BELLS[country]).map((p) => ({ ...p, key: uid() })),
    // Only on first render: later edits live in local state until saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const out: Record<string, Cell> = {};
    for (const e of timetable) {
      const row = initialRows.find((r) => r.start === e.start && r.end === e.end);
      if (row) out[`${e.weekday}|${row.key}`] = { id: e.id, kind: e.kind, classId: e.classId, subjectId: e.subjectId, label: e.label };
    }
    return out;
  });
  const [editing, setEditing] = useState<{ day: number; row: Row } | null>(null);
  const [mobileDay, setMobileDay] = useState(1);
  const [place, setPlace] = useState("");
  const [saving, setSaving] = useState(false);

  const entries: TimetableEntry[] = useMemo(
    () =>
      Object.entries(cells).flatMap(([key, c]) => {
        const [day, rowKey] = key.split("|");
        const row = rows.find((r) => r.key === rowKey);
        if (!row) return [];
        return [{ id: c.id ?? uid(), weekday: Number(day), start: row.start, end: row.end, kind: c.kind, classId: c.classId, subjectId: c.subjectId, label: c.label }];
      }),
    [cells, rows],
  );
  const badTimes = rows.filter((r) => !isValidTime(r.start) || !isValidTime(r.end) || timeToMin(r.end) <= timeToMin(r.start));
  const overlaps = overlappingEntries(entries.filter((e) => isValidTime(e.start) && isValidTime(e.end)));
  const lessons = entries.filter((e) => e.kind === "lesson").length;

  // Breaks of this timetable (short rows), or the school system's own when it has none yet.
  // The morning duty (15′ before the first bell), then the breaks of this timetable, or the
  // school system's own when it has none yet.
  const breaks = useMemo(() => {
    const valid = (p: Period) => isValidTime(p.start) && isValidTime(p.end) && timeToMin(p.end) > timeToMin(p.start);
    const short = (p: Period) => valid(p) && timeToMin(p.end) - timeToMin(p.start) < 30;
    const long = rows.filter((p) => valid(p) && !short(p));
    const day = long.length ? long : BELLS[country];
    const bell = timeToMin(day.map((p) => p.start).sort()[0]);
    const last = Math.max(...day.map((p) => timeToMin(p.end)));
    const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const own = rows.filter(short);
    const morning = own.find((p) => timeToMin(p.end) === bell) ?? { start: hhmm(bell - 15), end: hhmm(bell) };
    // A break sits between lessons; anything after the last bell is the teacher's «άλλη ώρα».
    // A break also never overlaps a lesson period: a short duty inside a period is «άλλη ώρα».
    const overlapsLesson = (p: Period) => day.some((l) => timeToMin(p.start) < timeToMin(l.end) && timeToMin(l.start) < timeToMin(p.end));
    const between = (p: Period) => timeToMin(p.start) >= bell && timeToMin(p.end) <= last && !overlapsLesson(p);
    const later = (own.some(between) ? own : BELLS[country].filter(short)).filter(between);
    return [morning, ...later].map((p) => ({ start: p.start, end: p.end }));
  }, [rows, country]);
  const dayEnd = useMemo(() => {
    const long = rows.filter((p) => isValidTime(p.start) && isValidTime(p.end) && timeToMin(p.end) - timeToMin(p.start) >= 30);
    return (long.length ? long : BELLS[country]).map((p) => p.end).sort().at(-1)!;
  }, [rows, country]);
  const rowFor = (b: Period) => rows.find((r) => r.start === b.start && r.end === b.end);
  // Other rows that already hold a duty: they stay in the duty grid as «Άλλη ώρα».
  const extraDuty = rows
    .filter((r) => !breaks.some((b) => b.start === r.start && b.end === r.end) && [1, 2, 3, 4, 5].some((d) => cells[`${d}|${r.key}`]?.kind === "duty"))
    .map((r) => ({ start: r.start, end: r.end }));
  const dutyOn = (day: number, b: Period) => {
    const r = rowFor(b);
    return !!r && cells[`${day}|${r.key}`]?.kind === "duty";
  };
  /** Marks (or clears) duties; rows for breaks not yet in the timetable are added. */
  const setDuties = (list: { day: number; b: Period }[], on: boolean) => {
    const added: Row[] = [];
    const keyOf = (b: Period) => {
      let row = rowFor(b) ?? added.find((r) => r.start === b.start && r.end === b.end);
      if (!row) {
        row = { key: uid(), start: b.start, end: b.end };
        added.push(row);
      }
      return row.key;
    };
    const keys = list.map(({ day, b }) => `${day}|${keyOf(b)}`);
    if (added.length) setRows((rs) => [...rs, ...added].sort((x, y) => timeToMin(x.start) - timeToMin(y.start)));
    setCells((cs) => {
      const next = { ...cs };
      for (const key of keys) {
        if (!on) {
          if (next[key]?.kind === "duty") delete next[key];
        } else if (next[key]?.kind !== "duty") next[key] = { kind: "duty", label: place };
      }
      return next;
    });
  };
  const toggleDuty = (day: number, b: Period) => setDuties([{ day, b }], !dutyOn(day, b));
  /** «Όλη τη μέρα»: the usual case, one day a week with the morning and every break. */
  const toggleDay = (day: number) => setDuties(breaks.map((b) => ({ day, b })), !breaks.every((b) => dutyOn(day, b)));

  const setRow = (key: string, p: Partial<Period>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const removeRow = (key: string) => {
    setRows((rs) => rs.filter((r) => r.key !== key));
    setCells((cs) => Object.fromEntries(Object.entries(cs).filter(([k]) => !k.endsWith(`|${key}`))));
  };
  const addRow = () => {
    const last = rows.at(-1);
    const start = last?.end ?? BELLS[country][0].start;
    const m = timeToMin(start) + PERIOD_MINUTES[country];
    const end = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    setRows((rs) => [...rs, { key: uid(), start, end }]);
  };

  /** Photo or PDF of the school timetable → filled grid, for the teacher to check before saving. */
  const readPhoto = async (file: File) => {
    if (mode !== "cloud") return toast("Η ανάγνωση από φωτογραφία είναι διαθέσιμη με λογαριασμό.");
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !/^image\/(jpeg|png|webp|gif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
      return toast("Ανέβασε φωτογραφία (JPG/PNG) ή PDF του προγράμματος.");
    setReading(true);
    setReadNotes("");
    try {
      const blob = isPdf ? file : await shrinkImage(file, 1800, 0.85);
      if (blob.size > 3_000_000) return toast("Το αρχείο είναι μεγάλο. Δοκίμασε φωτογραφία ή PDF μιας σελίδας.");
      const mediaType = isPdf ? "application/pdf" : blob.type === "image/jpeg" || blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "";
      if (!mediaType) return toast("Αυτή η φωτογραφία δεν διαβάζεται. Τράβηξέ τη ξανά από την κάμερα ή στείλε τη ως JPG.");
      const r = await aiReadTimetable({ data: await toBase64(blob), mediaType }, teacher, allClasses.map((c) => c.name), country);
      if (!r.ok) return toast(r.error);
      const plan = planImport(r.data.entries, allClasses);
      const created = new Map<string, string>();
      for (const name of plan.newClasses) created.set(name, addClass({ name: name.slice(0, 40), grade: gradeFromName(name), room: "" }));
      const newRows = plan.periods.map((p) => ({ ...p, key: uid() }));
      const next: Record<string, Cell> = {};
      for (const c of plan.cells) {
        const row = newRows.find((x) => x.start === c.start && x.end === c.end)!;
        const classId = c.classId ?? (c.className ? created.get(c.className) : undefined);
        if (c.kind === "lesson" && !classId) continue;
        next[`${c.weekday}|${row.key}`] = { kind: c.kind, classId, subjectId: c.subjectId, label: c.label };
      }
      setRows(newRows);
      setCells(next);
      setReadNotes(r.data.notes?.trim() ?? "");
      toast(
        `Διάβασα ${plan.cells.length} ώρες${plan.newClasses.length ? ` · νέα τμήματα: ${plan.newClasses.join(", ")}` : ""}. Έλεγξέ τες και πάτα Αποθήκευση.`,
      );
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveTimetable(entries);
      const duties = entries.filter((e) => e.kind === "duty").length;
      const remind = mode === "cloud" && duties > 0 && (await pushState()) === "off";
      toast(
        mode === "cloud" ? `Το πρόγραμμα δημιουργήθηκε έως ${shortDate(yearFor(country, today).end)}` : "Το πρόγραμμα αποθηκεύτηκε",
        remind
          ? {
              label: `Υπενθύμιση ${dutyLabel(country).toLowerCase()}`,
              run: () => void enablePush().then((r) => toast(r.ok ? "Έτοιμο · θα σε ειδοποιώ 5′ πριν" : r.error)),
            }
          : undefined,
      );
      router.push("/");
    } catch {
      toast("Δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
    } finally {
      setSaving(false);
    }
  };

  const timeInput = (r: Row, field: "start" | "end") => (
    <input
      value={r[field]}
      onChange={(e) => setRow(r.key, { [field]: e.target.value })}
      inputMode="numeric"
      maxLength={5}
      aria-label={field === "start" ? "Έναρξη" : "Λήξη"}
      className={cx(inputClass, "h-9 !w-[74px] shrink-0 px-1 text-center text-xs tabular-nums lg:!w-[60px]", !isValidTime(r[field]) && "border-danger")}
    />
  );

  return (
    <div>
      <PageHeader
        back={welcome ? undefined : "/schedule"}
        title="Ωρολόγιο πρόγραμμα"
        subtitle={welcome ? "Τελευταίο βήμα: συμπλήρωσε την εβδομάδα σου όπως στο πρόγραμμα του σχολείου." : `Η εβδομάδα σου: μαθήματα, ${country === "cy" ? "παιδονομίες" : "εφημερίες"}, κενά.`}
      />

      <Card className="mb-5 flex flex-col gap-3 border-dashed p-4 text-sm sm:flex-row sm:items-center">
        <Camera className="hidden size-6 shrink-0 text-brand-500 sm:block" />
        <p className="flex-1 text-muted">
          <b className="text-ink">Έχεις το πρόγραμμα του σχολείου;</b> Τράβηξε φωτογραφία ή ανέβασε το PDF και θα συμπληρωθεί αυτόματα. Το ελέγχεις πριν το αποθηκεύσεις.
        </p>
        <Button variant="secondary" disabled={reading} onClick={() => photoRef.current?.click()}>
          {reading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {reading ? "Διαβάζω το πρόγραμμα…" : "Φωτογραφία ή PDF"}
        </Button>
        <input
          ref={photoRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void readPhoto(f);
          }}
        />
      </Card>
      <DutyPicker
        breaks={breaks}
        dayEnd={dayEnd}
        extra={extraDuty}
        isOn={dutyOn}
        onToggle={toggleDuty}
        onDay={toggleDay}
        onAdd={(days, p) => setDuties(days.map((day) => ({ day, b: p })), true)}
        place={place}
        setPlace={setPlace}
      />

      {readNotes && (
        <p role="note" className="mb-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" /> {readNotes}
        </p>
      )}

      {/* Mobile: one day at a time */}
      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {DAYS_SHORT.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={mobileDay === i + 1}
              onClick={() => setMobileDay(i + 1)}
              className={clsx("h-10 rounded-xl border text-xs font-bold", mobileDay === i + 1 ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted")}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <div className="flex w-[74px] shrink-0 flex-col gap-1">
                {timeInput(r, "start")}
                {timeInput(r, "end")}
              </div>
              <div className="min-w-0 flex-1">
                <CellView cell={cells[`${mobileDay}|${r.key}`]} label={`${DAYS[mobileDay - 1]} ${r.start}`} onClick={() => setEditing({ day: mobileDay, row: r })} />
              </div>
              <IconButton label="Διαγραφή γραμμής" onClick={() => removeRow(r.key)}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: the whole week */}
      <Card className="hidden overflow-x-auto p-3 lg:block">
        <table className="w-full border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-[150px] text-left text-xs font-semibold text-muted">Ώρα</th>
              {DAYS.map((d) => (
                <th key={d} className="text-left text-xs font-bold uppercase tracking-wide text-muted">
                  {d}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <div className="flex items-center gap-1">
                    {timeInput(r, "start")}
                    <span className="text-muted">–</span>
                    {timeInput(r, "end")}
                  </div>
                </td>
                {DAYS.map((d, i) => (
                  <td key={d} className="min-w-[120px]">
                    <CellView cell={cells[`${i + 1}|${r.key}`]} label={`${d} ${r.start}`} onClick={() => setEditing({ day: i + 1, row: r })} />
                  </td>
                ))}
                <td>
                  <IconButton label="Διαγραφή γραμμής" onClick={() => removeRow(r.key)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Button variant="secondary" className="mt-3" onClick={addRow}>
        <Plus className="size-4" /> Γραμμή
      </Button>

      {(badTimes.length > 0 || overlaps.size > 0) && (
        <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {badTimes.length > 0 ? "Κάποιες ώρες δεν είναι σωστές (μορφή 08:15, η λήξη μετά την έναρξη)." : "Δύο ώρες της ίδιας μέρας επικαλύπτονται. Διόρθωσε τις ώρες πριν την αποθήκευση."}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {lessons} {lessons === 1 ? "μάθημα" : "μαθήματα"} την εβδομάδα · θα δημιουργηθεί πρόγραμμα έως {shortDate(yearFor(country, today).end)}, χωρίς αργίες και διακοπές. Ό,τι έχεις ήδη σημειώσει σε μαθήματα δεν χάνεται.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {welcome && (
            <Button size="lg" variant="secondary" onClick={() => router.push("/")}>
              Αργότερα
            </Button>
          )}
          <Button size="lg" onClick={save} disabled={saving || badTimes.length > 0 || overlaps.size > 0 || (!entries.length && !timetable.length)}>
            {saving && <Loader2 className="size-5 animate-spin" />} Αποθήκευση προγράμματος
          </Button>
        </div>
      </div>

      {editing && (
        <CellEditor
          key={`${editing.day}|${editing.row.key}`}
          open
          title={`${DAYS[editing.day - 1]} · ${editing.row.start}–${editing.row.end}`}
          cell={cells[`${editing.day}|${editing.row.key}`]}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            const key = `${editing.day}|${editing.row.key}`;
            setCells((cs) => {
              const next = { ...cs };
              if (c) next[key] = c;
              else delete next[key];
              return next;
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export default function TimetablePage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
