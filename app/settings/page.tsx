"use client";

import { CalendarClock, ChevronRight, Info, LogIn, LogOut, Monitor, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, Card, cx, Field, inputClass, Segmented, Toggle } from "@/components/ui";
import { usePrefs } from "@/lib/prefs";
import { schoolYear, schoolYearStart } from "@/lib/schoolYear";
import { flushWrites, useApp } from "@/lib/store";
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
  const setCountry = useApp((s) => s.setCountry);
  const [moving, setMoving] = useState(false);
  const mode = useApp((s) => s.mode);
  const email = useApp((s) => s.email);
  const today = useApp((s) => s.today);
  const timetable = useApp((s) => s.timetable);
  const leave = useApp((s) => s.leave);
  const router = useRouter();
  const [name, setName] = useState(profile.displayName);
  const [school, setSchool] = useState(profile.schoolName);
  useEffect(() => {
    setName(profile.displayName);
    setSchool(profile.schoolName);
  }, [profile.displayName, profile.schoolName]);

  const country = profile.country;
  const year = schoolYear(country, schoolYearStart(today));
  const dirty = name.trim() !== profile.displayName || school.trim() !== profile.schoolName;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader back="/" title="Σχολείο & χρονιά" subtitle={mode === "cloud" ? email : "Επίδειξη χωρίς λογαριασμό"} />

      <Section title="Σχολείο">
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <Field label="Το όνομά σου">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={cx(inputClass, "h-11")} />
          </Field>
          <Field label="Σχολείο">
            <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} placeholder="π.χ. 3ο Δημοτικό Σχολείο Πάτρας" className={cx(inputClass, "h-11")} />
          </Field>
          {dirty && (
            <Button
              className="sm:col-span-2 sm:justify-self-end"
              onClick={() => {
                update({ displayName: name.trim(), schoolName: school.trim() });
                toast("Αποθηκεύτηκε");
              }}
            >
              Αποθήκευση
            </Button>
          )}
        </div>
        <Row label="Χώρα" hint="Αλλάζει αργίες, τρίμηνα και ορολογία (εφημερία / παιδονομία).">
          <Segmented<"gr" | "cy">
            className="w-full sm:w-56"
            value={country}
            onChange={async (c) => {
              if (moving) return;
              setMoving(true);
              try {
                await setCountry(c);
                toast(c === "cy" ? "Το ημερολόγιο άλλαξε σε Κύπρου" : "Το ημερολόγιο άλλαξε σε Ελλάδας");
              } catch {
                toast("Δεν ολοκληρώθηκε η αλλαγή. Δοκίμασε ξανά.");
              } finally {
                setMoving(false);
              }
            }}
            options={[
              { value: "gr", label: "Ελλάδα" },
              { value: "cy", label: "Κύπρος" },
            ]}
          />
        </Row>
        <LinkRow
          href="/settings/timetable"
          icon={<CalendarClock />}
          label="Ωρολόγιο πρόγραμμα"
          hint={timetable.length ? `${timetable.length} ${timetable.length === 1 ? "ώρα" : "ώρες"} την εβδομάδα` : `Πρόσθεσε μαθήματα, ${country === "cy" ? "παιδονομίες" : "εφημερίες"} και κενά`}
        />
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
      </Section>

      <Section title="Εμφάνιση">
        <Row label="Θέμα" hint="«Συσκευής»: ακολουθεί το κινητό ή τον υπολογιστή σου, και σκούρο το βράδυ.">
          <Segmented<"light" | "system">
            className="w-full sm:w-64"
            value={prefs.theme}
            onChange={(theme) => setPrefs({ theme })}
            options={[
              {
                value: "light",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Sun className="size-4" /> Φωτεινό
                  </span>
                ),
              },
              {
                value: "system",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="size-4" /> Συσκευής
                  </span>
                ),
              },
            ]}
          />
        </Row>
        <Row label="Μεγάλα γράμματα" hint="Όλο το κείμενο λίγο μεγαλύτερο.">
          <Toggle label="Μεγάλα γράμματα" checked={prefs.text === "large"} onChange={(v) => setPrefs({ text: v ? "large" : "normal" })} />
        </Row>
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
    </div>
  );
}
