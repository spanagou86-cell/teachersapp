"use client";

import { Bell, Search } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import { needsLog, useClock } from "../lesson";
import { SubjectIcon } from "../subject";
import { Avatar, cx, inputClass, Sheet } from "../ui";

export interface Found {
  key: string;
  href: string;
  title: string;
  sub: string;
  icon: ReactNode;
}

/** Materials, coming lessons and pupils that match what the teacher typed (no accents needed). */
export function useSearch(q: string): Found[] {
  const materials = useApp((s) => s.materials);
  const slots = useApp((s) => s.slots);
  const students = useApp((s) => s.students);
  const classes = useApp((s) => s.classes);
  const today = useApp((s) => s.today);
  return useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const term = norm(q.trim());
    if (!term) return [];
    const out: Found[] = [];
    for (const m of materials)
      if (norm(m.title).includes(term)) out.push({ key: m.id, href: `/materials/${m.id}`, title: m.title, sub: "Υλικό", icon: <SubjectIcon id={m.subjectId} size="sm" /> });
    const seen = new Set<string>();
    for (const s of slots)
      if (s.date >= today && s.topic && norm(s.topic).includes(term) && !seen.has(s.topic)) {
        seen.add(s.topic);
        out.push({ key: s.id, href: `/lessons/${s.id}`, title: s.topic, sub: `Μάθημα · ${shortDate(s.date)} ${s.start}`, icon: <SubjectIcon id={s.subjectId} size="sm" /> });
      }
    for (const st of students)
      if (norm(`${st.firstName} ${st.lastName}`).includes(term))
        out.push({
          key: st.id,
          href: `/students/${st.id}`,
          title: `${st.firstName} ${st.lastName}`,
          sub: `Μαθητής · ${classes.find((c) => c.id === st.classId)?.name}`,
          icon: <Avatar name={`${st.firstName} ${st.lastName}`} size="sm" />,
        });
    return out.slice(0, 8);
  }, [q, materials, slots, students, classes, today]);
}

export function FoundList({ q, results, onPick }: { q: string; results: Found[]; onPick: () => void }) {
  if (!q.trim()) return null;
  if (!results.length) return <p className="px-3 py-4 text-sm text-muted">Δεν βρέθηκε κάτι για «{q}».</p>;
  return (
    <>
      {results.map((r) => (
        <Link key={r.key} href={r.href} onClick={onPick} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-line-2">
          {r.icon}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{r.title}</span>
            <span className="block text-xs text-muted">{r.sub}</span>
          </span>
        </Link>
      ))}
    </>
  );
}

/** Lessons that ended and still wait for «Πώς πήγε;». */
export function usePendingLessons() {
  const slots = useApp((s) => s.slots);
  const clock = useClock();
  return useMemo(() => slots.filter((s) => needsLog(s, clock)), [slots, clock]);
}

export function PendingList({ onPick }: { onPick?: () => void }) {
  const pending = usePendingLessons();
  const subjects = useSubjects();
  if (!pending.length) return <p className="px-2 py-3 text-sm text-muted">Όλα τα μαθήματα έχουν σημείωση.</p>;
  return (
    <>
      {pending.map((s) => (
        <Link key={s.id} href={`/lessons/${s.id}`} onClick={onPick} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-line-2">
          <SubjectIcon id={s.subjectId} size="sm" />
          <span className="text-sm">
            <span className="block font-semibold">{s.topic || subjects.find((x) => x.id === s.subjectId)?.name}</span>
            <span className="text-xs text-muted">
              {shortDate(s.date)} · {s.start} · πώς πήγε;
            </span>
          </span>
        </Link>
      ))}
    </>
  );
}

/** Search and the bell on phones: the same as the computer's top bar, in sheets. */
export function MobileFinders() {
  const router = useRouter();
  const [open, setOpen] = useState<null | "search" | "bell">(null);
  const [q, setQ] = useState("");
  const results = useSearch(q);
  const pending = usePendingLessons();
  const close = () => {
    setOpen(null);
    setQ("");
  };
  const btn = "relative flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors active:bg-line-2";
  return (
    <>
      <button type="button" aria-label="Αναζήτηση" onClick={() => setOpen("search")} className={btn}>
        <Search className="size-5" />
      </button>
      <button type="button" aria-label={`Ειδοποιήσεις (${pending.length})`} onClick={() => setOpen("bell")} className={btn}>
        <Bell className="size-5" />
        {pending.length > 0 && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-surface bg-danger" />}
      </button>
      <Sheet open={open === "search"} onClose={close} title="Αναζήτηση">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                close();
                router.push(results[0].href);
              }
            }}
            placeholder="Μαθήματα, υλικό, μαθητές…"
            aria-label="Αναζήτηση"
            className={cx(inputClass, "h-11 pl-10")}
          />
        </div>
        <div className="mt-2 grid gap-0.5">
          <FoundList q={q} results={results} onPick={close} />
        </div>
      </Sheet>
      <Sheet open={open === "bell"} onClose={close} title="Περιμένουν «Πώς πήγε;»">
        <div className="grid gap-0.5">
          <PendingList onPick={close} />
        </div>
      </Sheet>
    </>
  );
}
