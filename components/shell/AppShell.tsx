"use client";

import clsx from "clsx";
import { Bell, BookOpen, ChevronDown, Crown, FileUp, Info, Plus, Search, Sparkles, StickyNote, ArrowRight, School } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { isBarePath, useSession } from "@/lib/store/session";
import { Avatar } from "../ui";
import { Toaster } from "../toast";
import { UploadTrigger } from "../upload";
import { SubjectIcon } from "../subject";
import { needsLog, useClock } from "../lesson";
import { isActive, MOBILE_NAV, SIDEBAR_NAV } from "./nav";

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
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur lg:flex">
      <div className="flex items-center justify-between px-2">
        <Logo />
        {mode === "cloud" && (
          <span title={syncing ? "Αποθήκευση…" : "Όλα αποθηκεύτηκαν"} className={clsx("size-2 rounded-full", syncing ? "animate-pulse-soft bg-amber" : "bg-brand-500")} />
        )}
      </div>
      <div className="mt-6 flex h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink-2">
        <School className="size-4 text-muted" />
        <span className="flex-1 truncate">{profile.schoolName || "Το σχολείο μου"}</span>
      </div>
      <nav className="mt-5 flex flex-col gap-1">
        {SIDEBAR_NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                active ? "bg-brand-50 font-semibold text-brand" : "text-ink-2 hover:bg-line-2",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <Link href="/about#plans" className="block rounded-xl bg-amber-50 p-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Crown className="size-4 text-amber" /> Δοκιμή · 5 ημέρες ακόμη
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand underline underline-offset-2">
            Δες τα πακέτα <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <Link href="/about" className="flex items-center gap-3 rounded-xl border-t border-line px-2 pt-4 hover:opacity-80">
          <Avatar name={profile.displayName || "?"} seed={3} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile.displayName || "Λογαριασμός"}</span>
            <span className="block truncate text-xs text-muted">{mode === "demo" ? "Επίδειξη" : profile.schoolName || "Εκπαιδευτικός"}</span>
          </span>
          <Info className="size-4 text-muted" />
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
      if (s.date >= today && norm(s.topic).includes(term) && !seen.has(s.topic)) {
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

function CreateMenu() {
  const firstClass = useApp((s) => s.classes[0]?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-line-2";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-xl bg-brand pl-4 pr-3 text-[15px] font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        <Plus className="size-5" /> Δημιουργία <ChevronDown className="size-4 opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 animate-fade-in rounded-2xl border border-line bg-surface p-1.5 shadow-pop" onClick={() => setOpen(false)}>
          <Link href="/materials/new" className={item}>
            <Sparkles className="size-4 text-brand" /> Νέο υλικό με AI
          </Link>
          <UploadTrigger className={item}>
            <FileUp className="size-4 text-brand" /> Ανέβασμα αρχείου
          </UploadTrigger>
          <Link href={firstClass ? `/classes/${firstClass}?tab=notes` : "/classes"} className={item}>
            <StickyNote className="size-4 text-brand" /> Σημείωση τάξης
          </Link>
        </div>
      )}
    </div>
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
                  <span className="block font-semibold">{s.topic}</span>
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

function TopBar() {
  return (
    <header className="no-print sticky top-0 z-20 hidden items-center gap-4 bg-bg/85 px-8 py-4 backdrop-blur lg:flex">
      <SearchBox />
      <div className="ml-auto flex items-center gap-2">
        <Notifications />
        <CreateMenu />
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {MOBILE_NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px]", active ? "font-bold text-brand" : "text-muted")}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} fill={active ? "currentColor" : "none"} fillOpacity={0.15} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
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

export function AppShell({ children }: { children: ReactNode }) {
  const ready = useSession();
  const pathname = usePathname();
  if (isBarePath(pathname))
    return (
      <div className="min-h-dvh">
        {ready ? children : <div className="mx-auto max-w-md p-6"><Skeleton /></div>}
        <Toaster />
      </div>
    );
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-2">{ready ? children : <Skeleton />}</main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
