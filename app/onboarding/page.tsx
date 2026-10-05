"use client";

import { ArrowRight, Loader2, Plus, Trash2, Users } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/AppShell";
import { toast } from "@/components/toast";
import { Button, Card, cx, Field, IconButton, inputClass, Segmented, Select } from "@/components/ui";
import { RosterImport } from "@/components/roster";
import { GrowingTextarea } from "@/components/text";
import { GRADES } from "@/lib/grades";
import { flushWrites, useApp } from "@/lib/store";

interface Draft {
  key: number;
  name: string;
  grade: string;
  room: string;
  students: string;
}

const blank = (key: number): Draft => ({ key, name: "", grade: GRADES[3], room: "", students: "" });

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const existing = useApp((s) => s.classes);
  const mode = useApp((s) => s.mode);
  const updateProfile = useApp((s) => s.updateProfile);
  const addClass = useApp((s) => s.addClass);
  const addStudents = useApp((s) => s.addStudents);
  const [name, setName] = useState(profile.displayName);
  const [school, setSchool] = useState(profile.schoolName);
  const [country, setCountry] = useState(profile.country);
  const [drafts, setDrafts] = useState<Draft[]>([blank(1)]);
  const [busy, setBusy] = useState(false);

  // Someone who already has classes only needs the timetable step.
  useEffect(() => {
    if (mode === "cloud" && existing.length) router.replace("/settings/timetable?welcome=1");
  }, [mode, existing.length, router]);

  const patch = (key: number, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const valid = name.trim() && drafts.every((d) => d.name.trim());

  const save = async () => {
    setBusy(true);
    updateProfile({ displayName: name.trim(), schoolName: school.trim(), country, onboarded: true });
    for (const d of drafts) {
      const id = addClass({ name: d.name.trim(), grade: d.grade, room: d.room.trim() });
      addStudents(id, d.students.split(/\n/));
    }
    await flushWrites();
    setBusy(false);
    toast("Τα τμήματα αποθηκεύτηκαν");
    router.push("/settings/timetable?welcome=1");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-8 text-[28px] font-semibold tracking-[-0.025em] text-brand-700 sm:text-4xl">Καλώς ήρθες!</h1>
      <p className="mt-1 text-lg text-muted">Δύο λεπτά για να στήσουμε την τάξη σου. Όλα αλλάζουν και αργότερα.</p>

      <Card className="mt-8 p-5">
        <h2 className="text-lg font-bold">1. Τα στοιχεία σου</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Χώρα" className="sm:col-span-2">
            <Segmented<"gr" | "cy">
              value={country}
              onChange={setCountry}
              options={[
                { value: "gr", label: "Ελλάδα" },
                { value: "cy", label: "Κύπρος" },
              ]}
            />
          </Field>
          <Field label="Το όνομά σου">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="π.χ. Σπύρος" className={cx(inputClass, "h-10")} />
          </Field>
          <Field label="Σχολείο">
            <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} placeholder="π.χ. 5ο Δημοτικό Σχολείο Πατρών" className={cx(inputClass, "h-10")} />
          </Field>
        </div>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-bold">2. Τα τμήματά σου</h2>
      <div className="space-y-4">
        {drafts.map((d, i) => {
          const count = d.students.split(/\n/).filter((x) => x.trim()).length;
          return (
            <Card key={d.key} className="p-5">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand">{i + 1}</span>
                <span className="flex-1 font-semibold">{d.name || "Νέο τμήμα"}</span>
                {drafts.length > 1 && (
                  <IconButton label="Αφαίρεση τμήματος" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Όνομα τμήματος">
                  <input value={d.name} onChange={(e) => patch(d.key, { name: e.target.value })} maxLength={40} placeholder="π.χ. Δ1" className={cx(inputClass, "h-10")} />
                </Field>
                <Field label="Τάξη">
                  <Select value={d.grade} onChange={(e) => patch(d.key, { grade: e.target.value })}>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Αίθουσα (προαιρετικό)">
                  <input value={d.room} onChange={(e) => patch(d.key, { room: e.target.value })} maxLength={60} placeholder="π.χ. Αίθουσα 3" className={cx(inputClass, "h-10")} />
                </Field>
              </div>
              <div className="mt-3">
                <RosterImport
                  className={d.name}
                  onAdd={(list) =>
                    patch(d.key, { students: [d.students.trim(), ...list.map((x) => `${x.firstName} ${x.lastName}`.trim())].filter(Boolean).join("\n") })
                  }
                />
              </div>
              <Field label={`Μαθητές${count ? ` · ${count}` : ""}`} className="mt-3">
                <GrowingTextarea
                  value={d.students}
                  onChange={(e) => patch(d.key, { students: e.target.value })}
                  rows={4}
                  placeholder={"Ένα όνομα ανά γραμμή, π.χ.\nΜαρία Κ.\nΝίκος Π."}
                  className={cx(inputClass, "py-2.5")}
                />
              </Field>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <Users className="size-3.5" /> Μπορείς να επικολλήσεις τη λίστα από το Excel ή το πληροφοριακό σύστημα.
              </p>
            </Card>
          );
        })}
      </div>
      <Button variant="secondary" className="mt-4" onClick={() => setDrafts((ds) => [...ds, blank(Date.now())])}>
        <Plus className="size-4" /> Κι άλλο τμήμα
      </Button>

      <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Επόμενο βήμα: το ωρολόγιο πρόγραμμα (μαθήματα, {country === "cy" ? "παιδονομίες" : "εφημερίες"}, κενά).</p>
        <Button size="lg" disabled={!valid || busy} onClick={save}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : null} Συνέχεια <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
