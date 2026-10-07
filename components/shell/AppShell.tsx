"use client";

// Progress reports follow the signed-in teacher (and are wiped on sign-out) from the first screen.
import "@/lib/store/reports";

import clsx from "clsx";
import { Bell, Loader2, LogOut, Search, Settings, Sparkles } from "@/components/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushWrites, useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { isBarePath, useSession } from "@/lib/store/session";
import { trackVisit } from "@/lib/history";
import { useKeyboardFlag } from "@/lib/viewport";
import { Avatar } from "../ui";
import { Toaster } from "../toast";
import { ConfirmHost } from "../confirm";
import { openPrepare, PrepareSheet, useJobState } from "../prepare";
import { setJobNavigator } from "@/lib/store/jobs";
import { FoundList, PendingList, usePendingLessons, useSearch } from "./finders";
import { isActive, NAV } from "./nav";
import { SyllabusSheet } from "../syllabus";
import { CloseDaySheet } from "../closeDay";

/** The app mark: a «τ» on ink, with the red dot of the teacher's pen. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="14" fill="var(--color-ink)" />
      <path d="M17 22.5h28" stroke="var(--color-bg)" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M30 23v15.5a8.5 8.5 0 0 0 8.5 8.5" fill="none" stroke="var(--color-bg)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="47.5" cy="46.5" r="4.25" fill="#e5484d" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx("flex items-center gap-2 text-ink", className)} aria-label="τάξη — αρχική">
      <LogoMark className="size-7" />
      <span className="flex items-baseline text-[23px] font-semibold leading-none tracking-[-0.03em]">
        τάξη<span className="ml-0.5 size-[5px] rounded-full bg-now" />
      </span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const profile = useApp((s) => s.profile);
  const mode = useApp((s) => s.mode);
  const syncing = useApp((s) => s.syncing);
  const email = useApp((s) => s.email);
  const leave = useApp((s) => s.leave);
  const router = useRouter();
  const signOut = async () => {
    if (mode === "cloud") {
      await flushWrites();
      await supabase().auth.signOut();
    }
    leave();
    router.replace("/login");
  };
  const item = (active: boolean) =>
    clsx("flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors", active ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(26_34_56/0.05)]" : "font-medium text-ink-2 hover:bg-line-2");
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-line-2/60 px-3 py-5 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Logo />
        {mode === "cloud" && (
          <span title={syncing ? "Αποθήκευση…" : "Όλα αποθηκεύτηκαν"} className={clsx("size-2 rounded-full", syncing ? "animate-pulse-soft bg-amber" : "bg-brand-500")} />
        )}
        {mode === "demo" && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber">Επίδειξη</span>}
      </div>
      {profile.schoolName && <p className="mt-1 truncate px-2 text-[13px] text-muted">{profile.schoolName}</p>}
      <PrepareButton />
      <nav className="mt-4 flex flex-col gap-1">
        {NAV.map(({ href, label, Icon, key }) => (
          <Link key={href} href={href} className={item(isActive(pathname, href))}>
            <Icon className="size-[18px]" />
            {label}
            <kbd className="ml-auto rounded border border-line bg-surface px-1.5 font-mono text-[10.5px] font-medium uppercase text-muted">{key}</kbd>
          </Link>
        ))}
      </nav>
      <div className="mt-auto grid gap-1">
        <Link href="/settings" className={item(pathname.startsWith("/settings"))}>
          <Settings className="size-[18px]" /> Ρυθμίσεις
        </Link>
        <div className="mt-2 flex items-center gap-2 border-t border-line px-1.5 pt-4">
          <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
            <Avatar name={profile.displayName || "?"} seed={3} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{profile.displayName || "Λογαριασμός"}</span>
              <span className="block truncate text-xs text-muted">{mode === "demo" ? "Χωρίς λογαριασμό" : (email ?? "Ο λογαριασμός μου")}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            aria-label={mode === "demo" ? "Έξοδος από την επίδειξη" : "Αποσύνδεση"}
            title={mode === "demo" ? "Έξοδος από την επίδειξη" : "Αποσύνδεση"}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-line-2 hover:text-ink"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearch(q);

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

  return (
    <div className="relative max-w-2xl flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
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
        className="h-10 w-full rounded-lg border border-line bg-surface pl-10 pr-16 text-[14px] outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-line-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">⌘ K</kbd>
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-12 z-40 animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
          <FoundList q={q} results={results} onPick={() => setQ("")} />
        </div>
      )}
    </div>
  );
}

/** The AI's front door on a computer: first thing in the sidebar. */
function PrepareButton() {
  const { running, ready } = useJobState();
  return (
    <button
      type="button"
      onClick={() => openPrepare()}
      className="relative mt-5 flex h-10 items-center gap-2 rounded-lg bg-brand px-3 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(26_34_56/0.2)] transition-[background-color,transform] hover:bg-brand-hover active:scale-[0.98]"
    >
      {running ? <Loader2 className="size-[18px] animate-spin" /> : <Sparkles className="size-[18px]" />}
      {running ? "Φτιάχνω…" : "Ετοίμασε"}
      {ready && !running && <span className="size-2 rounded-full bg-white" aria-label="Έτοιμο υλικό" />}
      <kbd className="ml-auto rounded border border-white/30 px-1.5 font-mono text-[10.5px] font-medium">N</kbd>
    </button>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const pending = usePendingLessons();
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Ειδοποιήσεις (${pending.length})`}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="relative flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-line-2"
      >
        <Bell className="size-5" />
        {pending.length > 0 && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-bg bg-danger" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 animate-fade-in rounded-2xl border border-line bg-surface p-2 shadow-pop">
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Περιμένουν «Πώς πήγε;»</p>
          <PendingList />
        </div>
      )}
    </div>
  );
}

function TopBar() {
  return (
    <header className="no-print sticky top-0 z-20 hidden items-center gap-3 border-b border-line bg-bg/85 px-8 py-3 backdrop-blur lg:flex">
      <SearchBox />
      <div className="ml-auto flex items-center gap-2">
        <Notifications />
      </div>
    </header>
  );
}

/** The middle of the bottom bar: AI, one tap away from every screen. */
function PrepareTab() {
  const { running, ready } = useJobState();
  return (
    <button type="button" onClick={() => openPrepare()} className="flex flex-col items-center gap-1 pb-2 pt-1.5 text-[11px] font-semibold text-brand">
      <span className="relative flex h-[30px] w-12 items-center justify-center rounded-[10px] bg-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_6px_-1px_rgb(30_58_138/0.45)] transition-transform active:scale-95">
        {running ? <Loader2 className="size-[18px] animate-spin" /> : <Sparkles className="size-[19px]" strokeWidth={1.8} />}
        {ready && !running && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface bg-now" aria-label="Έτοιμο υλικό" />}
      </span>
      {running ? "Φτιάχνω…" : "Ετοίμασε"}
    </button>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const tab = ({ href, label, Icon }: (typeof NAV)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px]", active ? "font-semibold text-brand" : "font-medium text-muted")}>
        <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
        {label}
      </Link>
    );
  };
  return (
    <nav className="no-print kb-hide fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Κύρια πλοήγηση">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center">
        {NAV.slice(0, 2).map(tab)}
        <PrepareTab />
        {NAV.slice(2).map(tab)}
      </div>
    </nav>
  );
}

/** Single-key shortcuts on a keyboard: T Σήμερα, P Πρόγραμμα, C Τάξεις, M Υλικό, N Ετοίμασε. */
function useShortcuts() {
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
        openPrepare();
        return;
      }
      const hit = NAV.find((n) => n.key === k);
      if (hit) router.push(hit.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
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
      <button type="button" onClick={retry} className="mt-4 h-11 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-hover">
        Ξαναδοκίμασε
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, failed, retry } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  useShortcuts();
  // A finished AI job opens through the router, without reloading the app.
  useEffect(() => setJobNavigator((href) => router.push(href)), [router]);
  useKeyboardFlag();
  // Remember the in-app trail, so "Πίσω" returns where the teacher actually came from.
  useEffect(() => trackVisit(pathname + window.location.search), [pathname]);
  if (isBarePath(pathname))
    return (
      <div className="min-h-dvh">
        {failed ? <Offline retry={retry} /> : ready ? children : <div className="mx-auto max-w-md p-6"><Skeleton /></div>}
        <ConfirmHost />
        <Toaster />
      </div>
    );
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-2">{failed ? <Offline retry={retry} /> : ready ? children : <Skeleton />}</main>
      </div>
      <BottomNav />
      <PrepareSheet />
      <SyllabusSheet />
      <CloseDaySheet />
      <ConfirmHost />
      <Toaster />
    </div>
  );
}
