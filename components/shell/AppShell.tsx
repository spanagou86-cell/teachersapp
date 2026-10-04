"use client";

import clsx from "clsx";
import { Bell, BookOpen, Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { SUBJECTS } from "@/lib/seed";
import { isBarePath, useSession } from "@/lib/store/session";
import { trackVisit } from "@/lib/history";
import { useKeyboardFlag } from "@/lib/viewport";
import { Avatar } from "../ui";
import { Toaster } from "../toast";
import { CaptureSheet } from "../capture";
import { SubjectIcon } from "../subject";
import { needsLog, useClock } from "../lesson";
import { isActive, NAV } from "./nav";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx("flex items-center gap-2 text-brand", className)} aria-label="τάξη — αρχική">
      <BookOpen className="size-7" strokeWidth={2.4} fill="currentColor" fillOpacity={0.12} />
      <span className="text-[26px] font-extrabold leading-none tracking-tight">τάξη</span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const profile = useApp((s) => s.profile);
  const mode = useApp((s) => s.mode);
  const syncing = useApp((s) => s.syncing);
  const item = (active: boolean) =>
    clsx("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors", active ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-2 hover:bg-line-2");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-6 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Logo />
        {mode === "cloud" && (
          <span title={syncing ? "Αποθήκευση…" : "Όλα αποθηκεύτηκαν"} className={clsx("size-2 rounded-full", syncing ? "animate-pulse-soft bg-amber" : "bg-brand-500")} />
        )}
        {mode === "demo" && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber">Επίδειξη</span>}
      </div>
      {profile.schoolName && <p className="mt-1 truncate px-2 text-[13px] text-muted">{profile.schoolName}</p>}
      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map(({ href, label, Icon, key }) => (
          <Link key={href} href={href} className={item(isActive(pathname, href))}>
            <Icon className="size-5" />
            {label}
            <kbd className="ml-auto rounded border border-line px-1.5 text-[11px] font-medium uppercase text-muted">{key}</kbd>
          </Link>
        ))}
      </nav>
      <div className="mt-auto grid gap-1">
        <Link href="/settings" className={item(pathname.startsWith("/settings"))}>
          <Settings className="size-5" /> Ρυθμίσεις
        </Link>
        <Link href="/settings" className="mt-2 flex items-center gap-3 rounded-xl border-t border-line px-2 pt-4 hover:opacity-80">
          <Avatar name={profile.displayName || "?"} seed={3} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile.displayName || "Λογαριασμός"}</span>
            <span className="block truncate text-xs text-muted">{mode === "demo" ? "Χωρίς λογαριασμό" : "Ο λογαριασμός μου"}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const materials = useApp((s) => s.materials);
  const slots = useApp((s) => s.slots);
  const students = useApp((s) => s.students);
  const classes = useApp((s) => s.classes);
  const today = useApp((s) => s.today);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const term = norm(q.trim());
    if (!term) return [];
    const out: { key: string; href: string; title: string; sub: string; icon: ReactNode }[] = [];
    for (const m of materials)
      if (norm(m.title).includes(term))
        out.push({ key: m.id, href: `/materials/${m.id}`, title: m.title, sub: "Υλικό", icon: <SubjectIcon id={m.subjectId} size="sm" /> });
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
          href: `/classes/${st.classId}`,
          title: `${st.firstName} ${st.lastName}`,
          sub: `Μαθητής · ${classes.find((c) => c.id === st.classId)?.name}`,
          icon: <Avatar name={`${st.firstName} ${st.lastName}`} size="sm" />,
        });
    return out.slice(0, 8);
  }, [q, materials, slots, students, classes, today]);

  return (
    <div className="relative max-w-2xl flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            router.push(results[0].href);
            setOpen(false);
            setQ("");
          }
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="Αναζήτηση σε μαθήματα, αρχεία και μαθητές…"
        aria-label="Αναζήτηση"
        className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-16 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-brand-500"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-line-2 px-1.5 py-0.5 text-xs text-muted">⌘ K</kbd>
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-12 z-40 animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">Δεν βρέθηκε κάτι για «{q}».</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.key}
                href={r.href}
                onClick={() => setQ("")}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-line-2"
              >
                {r.icon}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block text-xs text-muted">{r.sub}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CaptureButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-11 items-center gap-2 rounded-xl bg-brand pl-3.5 pr-4 text-[15px] font-semibold text-white shadow-sm hover:bg-brand-hover"
    >
      <Plus className="size-5" /> Καταγραφή
      <kbd className="ml-1 rounded border border-white/30 px-1.5 text-[11px] font-medium">N</kbd>
    </button>
  );
}

function Notifications() {
  const slots = useApp((s) => s.slots);
  const [open, setOpen] = useState(false);
  const clock = useClock();
  const pending = slots.filter((s) => needsLog(s, clock));
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Ειδοποιήσεις (${pending.length})`}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="relative flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-line-2"
      >
        <Bell className="size-5" />
        {pending.length > 0 && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-bg bg-danger" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 animate-fade-in rounded-2xl border border-line bg-surface p-2 shadow-pop">
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Χρειάζονται καταγραφή</p>
          {pending.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">Όλα τα μαθήματα έχουν καταγραφεί.</p>
          ) : (
            pending.map((s) => (
              <Link key={s.id} href={`/lessons/${s.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-line-2">
                <SubjectIcon id={s.subjectId} size="sm" />
                <span className="text-sm">
                  <span className="block font-semibold">{s.topic || SUBJECTS.find((x) => x.id === s.subjectId)?.name}</span>
                  <span className="text-xs text-muted">{shortDate(s.date)} · {s.start} — τι διδάχθηκε;</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TopBar({ onCapture }: { onCapture: () => void }) {
  return (
    <header className="no-print sticky top-0 z-20 hidden items-center gap-4 bg-bg/85 px-8 py-4 backdrop-blur lg:flex">
      <SearchBox />
      <div className="ml-auto flex items-center gap-2">
        <Notifications />
        <CaptureButton onOpen={onCapture} />
      </div>
    </header>
  );
}

function BottomNav({ onCapture }: { onCapture: () => void }) {
  const pathname = usePathname();
  const tab = ({ href, label, Icon }: (typeof NAV)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px]", active ? "font-bold text-brand-700" : "text-muted")}>
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} />
        {label}
      </Link>
    );
  };
  return (
    <nav className="no-print kb-hide fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Κύρια πλοήγηση">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center">
        {NAV.slice(0, 2).map(tab)}
        <button
          type="button"
          onClick={onCapture}
          aria-label="Γρήγορη καταγραφή"
          className="mx-auto -mt-6 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-pop hover:bg-brand-hover"
        >
          <Plus className="size-7" strokeWidth={2.4} />
        </button>
        {NAV.slice(2).map(tab)}
      </div>
    </nav>
  );
}

/** Single-key shortcuts on a keyboard: T Σήμερα, H Ημερολόγιο, C Τάξεις, M Υλικό, N καταγραφή. */
function useShortcuts(onCapture: () => void) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (document.querySelector('[role="dialog"]') || isBarePath(window.location.pathname)) return;
      // Physical key, so the shortcuts also work with the Greek keyboard layout.
      const k = e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        onCapture();
        return;
      }
      const hit = NAV.find((n) => n.key === k);
      if (hit) router.push(hit.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, onCapture]);
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Φόρτωση">
      <div className="h-8 w-56 animate-pulse-soft rounded-lg bg-line" />
      <div className="h-40 animate-pulse-soft rounded-2xl bg-line" />
      <div className="h-64 animate-pulse-soft rounded-2xl bg-line" />
    </div>
  );
}

function Offline({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <p className="text-lg font-bold">Δεν υπάρχει σύνδεση</p>
      <p className="mt-1 text-sm text-muted">Δεν μπόρεσα να φέρω τα δεδομένα σου. Έλεγξε το διαδίκτυο και ξαναδοκίμασε.</p>
      <button type="button" onClick={retry} className="mt-4 h-11 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover">
        Ξαναδοκίμασε
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, failed, retry } = useSession();
  const pathname = usePathname();
  const [capture, setCapture] = useState(false);
  const openCapture = useCallback(() => setCapture(true), []);
  useShortcuts(openCapture);
  useKeyboardFlag();
  // Remember the in-app trail, so "Πίσω" returns where the teacher actually came from.
  useEffect(() => trackVisit(pathname + window.location.search), [pathname]);
  if (isBarePath(pathname))
    return (
      <div className="min-h-dvh">
        {failed ? <Offline retry={retry} /> : ready ? children : <div className="mx-auto max-w-md p-6"><Skeleton /></div>}
        <Toaster />
      </div>
    );
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar onCapture={openCapture} />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-2">{failed ? <Offline retry={retry} /> : ready ? children : <Skeleton />}</main>
      </div>
      <BottomNav onCapture={openCapture} />
      {capture && <CaptureSheet open onClose={() => setCapture(false)} />}
      <Toaster />
    </div>
  );
}
