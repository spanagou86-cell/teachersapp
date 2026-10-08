"use client";

import { CalendarClock, Check, ChevronRight, Download, FileText, Info, Loader2, LogIn, LogOut, MessageSquareText, ShieldCheck, Trash2 } from "@/components/icons";
import { openFeedback } from "@/components/feedback";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { InstallRow } from "@/components/pwa";
import { PushRow } from "@/components/pushRow";
import { PageHeader } from "@/components/shell/PageHeader";
import { AutoText } from "@/components/text";
import { toast } from "@/components/toast";
import { SchoolPicker } from "@/components/schoolPicker";
import { Button, Card, cx, Field, inputClass, Segmented, Sheet, Toggle } from "@/components/ui";
import { usePrefs } from "@/lib/prefs";
import { longDate } from "@/lib/dates";
import { dutyLabel, schoolYear, schoolYearStart, type Country } from "@/lib/schoolYear";
import { BELLS, isBreak } from "@/lib/timetable";
import { flushWrites, useApp } from "@/lib/store";
import { remote } from "@/lib/store/remote";
import { supabase } from "@/lib/supabase/client";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="px-1 text-sm font-bold text-muted">{title}</h2>
      <Card className="divide-y divide-line">{children}</Card>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
      <div className="min-w-[12rem] flex-1">
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function LinkRow({ href, icon, label, hint }: { href: string; icon: ReactNode; label: string; hint?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-line-2">
      <span className="text-brand-500 [&>svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );
}

const fmt = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};

export default function SettingsPage() {
  const [prefs, setPrefs] = usePrefs();
  const profile = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const [pendingCountry, setPendingCountry] = useState<"gr" | "cy">();
  const setLocalHoliday = useApp((s) => s.setLocalHoliday);
  const [moving, setMoving] = useState(false);
  const mode = useApp((s) => s.mode);
  const email = useApp((s) => s.email);
  const today = useApp((s) => s.today);
  const timetable = useApp((s) => s.timetable);
  const leave = useApp((s) => s.leave);
  const router = useRouter();

  const [busy, setBusy] = useState<"" | "export" | "delete">("");
  const userId = useApp((s) => s.userId);

  const download = async () => {
    setBusy("export");
    try {
      const st = useApp.getState();
      const data =
        mode === "cloud"
          ? { ...(await remote.exportAll()), account: { localHoliday: st.profile.localHoliday ?? null } }
          : { profile: st.profile, classes: st.classes, students: st.students, timetable: st.timetable, lessons: st.slots, materials: st.materials, attendance: st.attendance, tasks: st.tasks, notes: st.notes, studentNotes: st.studentNotes };
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), email, ...data }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `taxi-dedomena-${today}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Το αρχείο κατέβηκε");
    } catch {
      toast("Δεν ολοκληρώθηκε η λήψη. Δοκίμασε ξανά.");
    } finally {
      setBusy("");
    }
  };

  const removeAccount = async () => {
    const answer = prompt("Η διαγραφή είναι οριστική και δεν αναιρείται. Γράψε ΔΙΑΓΡΑΦΗ για επιβεβαίωση.\n\nΣυμβουλή: κατέβασε πρώτα τα δεδομένα σου.");
    if (answer?.trim().toUpperCase() !== "ΔΙΑΓΡΑΦΗ" || !userId) return;
    setBusy("delete");
    try {
      await flushWrites();
      await remote.deleteAccount(userId);
      leave();
      router.replace("/login");
      toast("Ο λογαριασμός σου διαγράφηκε");
    } catch {
      toast("Η διαγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά ή επικοινώνησε μαζί μας.");
      setBusy("");
    }
  };

  const country = profile.country;
  const year = schoolYear(country, schoolYearStart(today));
  // The feast day as a date inside this school year (it repeats every year).
  const feast = profile.localHoliday ? `${(Number(profile.localHoliday.slice(0, 2)) >= 7 ? year.start : year.end).slice(0, 4)}-${profile.localHoliday}` : "";
  const changeFeast = async (date: string) => {
    if (moving) return;
    setMoving(true);
    try {
      await setLocalHoliday(date ? date.slice(5) : undefined);
      toast(date ? `${longDate(date)}: χωρίς μαθήματα κάθε χρόνο` : "Η τοπική γιορτή αφαιρέθηκε");
    } catch {
      toast("Δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader back="/" title="Ρυθμίσεις" subtitle={mode === "cloud" ? email : "Επίδειξη χωρίς λογαριασμό"} />

      <Section title="Το προφίλ μου">
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <Field label="Το όνομά σου">
            <AutoText value={profile.displayName} onSave={(v) => update({ displayName: v })} maxLength={80} label="Το όνομά σου" placeholder="π.χ. Μαρία Παπαδοπούλου" className={cx(inputClass, "h-11")} />
          </Field>
          <Field label="Το σχολείο σου">
            {country === "cy" ? (
              <SchoolPicker value={profile.schoolName} onChange={(v) => update({ schoolName: v })} />
            ) : (
              <AutoText value={profile.schoolName} onSave={(v) => update({ schoolName: v })} allowEmpty maxLength={120} label="Το σχολείο σου" placeholder="π.χ. 3ο Δημοτικό Σχολείο Πάτρας" className={cx(inputClass, "h-11")} />
            )}
          </Field>
          <p className="flex items-center gap-1.5 text-[13px] text-muted sm:col-span-2">
            <Check className="size-3.5" /> Αποθηκεύεται αυτόματα · το σχολείο εμφανίζεται στα φύλλα εργασίας και στις εκτυπώσεις
          </p>
        </div>
        <Row label="Χώρα" hint="Αλλάζει αργίες, τρίμηνα και ορολογία (εφημερία / παιδονομία).">
          <Segmented<"gr" | "cy">
            className="w-full sm:w-56"
            value={country}
            onChange={(c) => c !== country && setPendingCountry(c)}
            options={[
              { value: "cy", label: "Κύπρος" },
              { value: "gr", label: "Ελλάδα" },
            ]}
          />
        </Row>
        <CountrySheet to={pendingCountry} onClose={() => setPendingCountry(undefined)} />
        <LinkRow
          href="/settings/timetable"
          icon={<CalendarClock />}
          label="Ωρολόγιο πρόγραμμα"
          hint={timetable.length ? `${timetable.length} ${timetable.length === 1 ? "ώρα" : "ώρες"} την εβδομάδα` : `Πρόσθεσε μαθήματα, ${country === "cy" ? "παιδονομίες" : "εφημερίες"} και κενά`}
        />
      </Section>

      <Section title="Λογαριασμός">
        {mode === "cloud" ? (
          <Row label={email ?? "Λογαριασμός"} hint="Τα δεδομένα σου συγχρονίζονται σε κινητό και υπολογιστή.">
            <Button
              variant="secondary"
              onClick={async () => {
                await flushWrites();
                await supabase().auth.signOut();
                leave();
                router.replace("/login");
              }}
            >
              <LogOut className="size-4" /> Αποσύνδεση
            </Button>
          </Row>
        ) : (
          <Row label="Επίδειξη" hint="Τα δεδομένα είναι δείγματα και μένουν σε αυτόν τον browser.">
            <Button
              onClick={() => {
                leave();
                router.replace("/login");
              }}
            >
              <LogIn className="size-4" /> Δημιούργησε λογαριασμό
            </Button>
          </Row>
        )}
        <LinkRow href="/about" icon={<Info />} label="Τι λειτουργεί" hint="Τι είναι έτοιμο και τι έρχεται" />
      </Section>

      <Section title="Σχολική χρονιά">
        <div className="grid gap-2 px-4 py-4 text-[14px]">
          <p>
            <span className="font-semibold">
              {year.start.slice(0, 4)}–{year.end.slice(0, 4)}
            </span>
            <span className="text-muted">
              {" "}
              · από {fmt(year.start)} έως {fmt(year.end)}
            </span>
          </p>
          <ul className="grid gap-1 text-muted">
            {year.terms.map((t) => (
              <li key={t.label}>
                {t.label}: {fmt(t.from)} – {fmt(t.to)}
              </li>
            ))}
          </ul>
          <Link href="/schedule?view=year" className="justify-self-start font-semibold text-brand-500 hover:underline">
            Η χρονιά με μια ματιά
          </Link>
        </div>
        <Row label="Τοπική γιορτή σχολείου" hint="Η γιορτή του Αγίου της κοινότητας, που δηλώνει το σχολείο. Εκείνη τη μέρα δεν μπαίνουν μαθήματα.">
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Τοπική γιορτή σχολείου"
              value={feast}
              min={year.start}
              max={year.end}
              disabled={moving}
              onChange={(e) => void changeFeast(e.target.value)}
              className={cx(inputClass, "h-11 w-44")}
            />
            {feast && (
              <Button variant="ghost" size="sm" disabled={moving} onClick={() => void changeFeast("")}>
                Καμία
              </Button>
            )}
          </div>
        </Row>
      </Section>

      <Section title="Ειδοποιήσεις">
        <PushRow />
      </Section>

      <Section title="Εμφάνιση">
        <Row label="Μεγάλα γράμματα" hint="Όλο το κείμενο λίγο μεγαλύτερο.">
          <Toggle label="Μεγάλα γράμματα" checked={prefs.text === "large"} onChange={(v) => setPrefs({ text: v ? "large" : "normal" })} />
        </Row>
        <InstallRow />
      </Section>


      <Section title="Βοήθεια">
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <MessageSquareText className="size-5 shrink-0 text-brand-500" />
          <p className="min-w-0 flex-1 text-[14px]">
            <b className="block">Στείλε μας σχόλιο ή ιδέα</b>
            <span className="text-muted">Τι σε δυσκόλεψε, τι λείπει. Το διαβάζει άνθρωπος.</span>
          </p>
          <Button variant="secondary" size="sm" onClick={openFeedback}>
            Γράψε μας
          </Button>
        </Card>
      </Section>

      <Section title="Τα δεδομένα σου">
        <Row label="Κατέβασε τα δεδομένα σου" hint="Όλα όσα έχεις καταχωρίσει, σε ένα αρχείο (JSON).">
          <Button variant="secondary" disabled={busy !== ""} onClick={download}>
            {busy === "export" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Λήψη
          </Button>
        </Row>
        <LinkRow href="/legal/privacy" icon={<ShieldCheck />} label="Πολιτική απορρήτου" />
        <LinkRow href="/legal/terms" icon={<FileText />} label="Όροι χρήσης" />
        <LinkRow href="/legal/dpa" icon={<FileText />} label="Σύμβαση επεξεργασίας δεδομένων" hint="Για το σχολείο σου (ΓΚΠΔ, άρθρο 28)" />
        {mode === "cloud" && (
          <Row label="Διαγραφή λογαριασμού" hint="Σβήνει οριστικά τον λογαριασμό, τους μαθητές, το υλικό και τα αρχεία σου.">
            <Button variant="danger" disabled={busy !== ""} onClick={removeAccount}>
              {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Διαγραφή
            </Button>
          </Row>
        )}
      </Section>
    </div>
  );
}

const COUNTRY_NAME: Record<Country, string> = { cy: "Κύπρος", gr: "Ελλάδα" };

/** A change of country, said out loud before it is saved: what follows it, and the bell for the timetable. */
function CountrySheet({ to, onClose }: { to?: Country; onClose: () => void }) {
  const setCountry = useApp((s) => s.setCountry);
  const timetable = useApp((s) => s.timetable);
  const [bell, setBell] = useState(true);
  const [saving, setSaving] = useState(false);
  const target = to ?? "cy";
  const b = BELLS[target];
  const periods = b.filter((p) => !isBreak(p)).length;
  const breaks = b.filter(isBreak);
  const y = schoolYear(target, schoolYearStart(new Date().toISOString().slice(0, 10)));

  const save = async () => {
    if (!to || saving) return;
    setSaving(true);
    try {
      const r = await setCountry(to, { bell: bell && timetable.length > 0 });
      onClose();
      const what = r.moved ? "αργίες και ώρες κουδουνιού" : "αργίες και τρίμηνα";
      toast(`Αποθηκεύτηκε · ${COUNTRY_NAME[to]}: ${what}${r.unmatched ? ` · έλεγξε ${r.unmatched === 1 ? "1 " + dutyLabel(to).toLowerCase() : `${r.unmatched} ${to === "cy" ? "παιδονομίες" : "εφημερίες"}`}` : ""}`);
    } catch {
      toast("Δεν ολοκληρώθηκε η αλλαγή. Δοκίμασε ξανά.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={!!to}
      onClose={onClose}
      title={`Χώρα: ${COUNTRY_NAME[target]}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Άκυρο
          </Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Αποθήκευση
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 text-[14px]">
        <p className="text-muted">Αλλάζουν μόνα τους, για όλη τη χρονιά:</p>
        <ul className="grid gap-2">
          <li className="flex gap-2.5 rounded-xl border border-line px-3 py-2.5">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>
              <b className="font-semibold">Αργίες, διακοπές και τρίμηνα {target === "cy" ? "Κύπρου" : "Ελλάδας"}</b>
              <span className="block text-[13px] text-muted">
                {y.holidays.length} αργίες και διακοπές · τα μαθήματα εκείνων των ημερών φεύγουν
              </span>
            </span>
          </li>
          <li className="flex gap-2.5 rounded-xl border border-line px-3 py-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>
              <b className="font-semibold">{dutyLabel(target)}</b> αντί για {dutyLabel(target === "cy" ? "gr" : "cy").toLowerCase()}, και τα μαθήματα με τα ονόματα {target === "cy" ? "του ΑΠ Κύπρου" : "της Ελλάδας"}
            </span>
          </li>
        </ul>
        {timetable.length > 0 && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-3">
            <input type="checkbox" checked={bell} onChange={(e) => setBell(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
            <span>
              <b className="font-semibold">Και οι ώρες του ωρολογίου</b>
              <span className="block text-[13px] text-muted">
                Κουδούνι {b[0].start}–{b.at(-1)!.end}: {periods} ώρες, {breaks.length} διαλείμματα ({breaks.map((p) => p.start).join(", ")}). Κάθε μάθημα κρατά τη θέση του (η 1η ώρα στην 1η) με θέμα και υλικό.
              </span>
            </span>
          </label>
        )}
      </div>
    </Sheet>
  );
}
