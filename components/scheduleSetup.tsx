"use client";

import clsx from "clsx";
import { BellRing, CalendarClock, CalendarPlus, Camera, Check, Loader2, ShieldCheck } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { openDutySheet } from "./dutySheet";
import { PushRow } from "./pushRow";
import { toast } from "./toast";
import { Sheet } from "./ui";
import { pushState, type PushState } from "@/lib/pushClient";
import { dutyLabel } from "@/lib/schoolYear";
import { useApp } from "@/lib/store";
import { readTimetablePhoto, useTimetableDraft } from "@/lib/timetablePhoto";

const DAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];

function Step({ icon, title, status, done, children }: { icon: ReactNode; title: string; status: string; done: boolean; children: ReactNode }) {
  // Done: one quiet line, the buttons still there. To do: a card that asks for it.
  if (done)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Check className="size-4" />
        </span>
        <div className="min-w-[11rem] flex-1">
          <p className="whitespace-nowrap text-[14px] font-semibold leading-tight">{title}</p>
          <p className="truncate text-[12.5px] text-muted">{status}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 [&>*]:h-9 [&>*]:px-3 [&>*]:text-[13px]">{children}</div>
      </div>
    );
  return (
    <div className="grid content-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-card">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{status}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const btn = "inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors disabled:opacity-60";
const primary = clsx(btn, "bg-brand text-white hover:bg-brand-hover");
const secondary = clsx(btn, "border border-line bg-surface text-ink hover:bg-line-2");

/**
 * The top of «Πρόγραμμα»: the timetable from a photo, the breaks on duty (and a one-off one),
 * and the reminders — each a button, nothing hidden behind a menu.
 */
export function ScheduleSetup({ day }: { day?: string }) {
  const router = useRouter();
  const mode = useApp((s) => s.mode);
  const timetable = useApp((s) => s.timetable);
  const classes = useApp((s) => s.classes);
  const profile = useApp((s) => s.profile);
  const setDraft = useTimetableDraft((s) => s.set);
  const [reading, setReading] = useState(false);
  const [push, setPush] = useState<PushState>();
  const [pushOpen, setPushOpen] = useState(false);
  const photo = useRef<HTMLInputElement>(null);
  const duty = dutyLabel(profile.country);

  useEffect(() => {
    void pushState().then(setPush);
  }, [pushOpen]);

  const lessons = timetable.filter((e) => e.kind === "lesson").length;
  const duties = timetable.filter((e) => e.kind === "duty").sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));

  const read = async (file: File) => {
    if (mode !== "cloud") return toast("Η ανάγνωση από φωτογραφία είναι διαθέσιμη με λογαριασμό.");
    setReading(true);
    const r = await readTimetablePhoto(file, { teacher: profile.displayName, classes: classes.map((c) => c.name), country: profile.country });
    setReading(false);
    if (!r.ok) return toast(r.error);
    // The timetable page shows what was read, for a check before saving.
    setDraft({ entries: r.entries, notes: r.notes });
    router.push("/settings/timetable");
  };

  return (
    <section aria-label="Το πρόγραμμά σου" className="mb-5 grid items-start gap-2.5 md:grid-cols-3">
      <Step
        icon={<CalendarClock className="size-5" />}
        title="Ωρολόγιο πρόγραμμα"
        done={lessons > 0}
        status={lessons ? `${lessons} ώρες μαθημάτων την εβδομάδα` : "Φωτογράφισε το πρόγραμμα του σχολείου και συμπληρώνεται μόνο του."}
      >
        <button type="button" disabled={reading} onClick={() => photo.current?.click()} className={lessons ? secondary : primary}>
          {reading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {reading ? "Διαβάζω…" : "Φωτογραφία"}
        </button>
        <Link href="/settings/timetable" className={secondary}>
          {lessons ? "Αλλαγές" : "Με το χέρι"}
        </Link>
        <input
          ref={photo}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.pdf"
          aria-label="Φωτογραφία ωρολογίου"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void read(f);
          }}
        />
      </Step>

      <Step
        icon={<ShieldCheck className="size-5" />}
        title={duty}
        done={duties.length > 0}
        status={
          duties.length
            ? duties
                .slice(0, 3)
                .map((d) => `${DAYS[d.weekday - 1]} ${d.start}`)
                .join(" · ") + (duties.length > 3 ? ` · +${duties.length - 3}` : "")
            : "Πάτα τα διαλείμματα που έχεις κάθε εβδομάδα."
        }
      >
        <Link href="/settings/timetable#duty" className={duties.length ? secondary : primary}>
          <ShieldCheck className="size-4" /> Τα διαλείμματά μου
        </Link>
        <button type="button" onClick={() => openDutySheet(day)} className={secondary}>
          <CalendarPlus className="size-4" /> Έκτακτη
        </button>
      </Step>

      <Step
        icon={<BellRing className="size-5" />}
        title="Ειδοποιήσεις"
        done={push === "on"}
        status={
          push === "on"
            ? `Ενεργές · 5′ πριν από κάθε ${duty.toLowerCase()}`
            : mode !== "cloud"
              ? "Με λογαριασμό: ειδοποίηση στο κινητό 5′ πριν."
              : `Ειδοποίηση στο κινητό 5′ πριν από κάθε ${duty.toLowerCase()}.`
        }
      >
        <button type="button" onClick={() => setPushOpen(true)} className={push === "on" ? secondary : primary}>
          <BellRing className="size-4" /> {push === "on" ? "Ρυθμίσεις" : "Άνοιξέ τες"}
        </button>
      </Step>

      <Sheet open={pushOpen} onClose={() => setPushOpen(false)} title="Ειδοποιήσεις">
        <div className="-mx-4 -my-3">
          <PushRow />
        </div>
      </Sheet>
    </section>
  );
}
