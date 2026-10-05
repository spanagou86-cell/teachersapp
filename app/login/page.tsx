"use client";

import { ArrowRight, Loader2, Mail, MailCheck, PlayCircle } from "@/components/icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/shell/AppShell";
import { Button, Card, cx, inputClass } from "@/components/ui";
import { useApp } from "@/lib/store";
import { cloudEnabled, supabase } from "@/lib/supabase/client";

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const startDemo = useApp((s) => s.startDemo);
  const loadCloud = useApp((s) => s.loadCloud);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const mode = useApp((s) => s.mode);
  useEffect(() => {
    if (mode) router.replace("/");
  }, [mode, router]);
  const [error, setError] = useState(params.get("error") === "link" ? "Ο σύνδεσμος έληξε ή άνοιξε σε άλλον browser. Ζήτησε νέο." : "");

  const send = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.status === 429 ? "Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά." : "Δεν στάλθηκε το email. Έλεγξε τη διεύθυνση.");
    else setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    setError("");
    const { data, error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error || !data.user) {
      setBusy(false);
      setError("Λάθος ή ληγμένος κωδικός.");
      return;
    }
    try {
      await loadCloud(data.user.id, data.user.email ?? undefined);
      router.replace("/");
    } catch {
      setBusy(false);
      setError("Συνδέθηκες, αλλά δεν φόρτωσαν τα δεδομένα. Έλεγξε το διαδίκτυο και ανανέωσε τη σελίδα.");
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <DayPreview />
      <div className="flex flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-3" />
      <p className="mb-8 text-center text-muted">Η τάξη σου. Μαζί σου.</p>
      <Card className="w-full max-w-sm p-6">
        {!cloudEnabled ? (
          <p className="text-sm text-muted">Η σύνδεση λογαριασμών δεν έχει ρυθμιστεί σε αυτή την έκδοση.</p>
        ) : !sent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes("@")) void send();
            }}
          >
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Σύνδεση</h1>
            <p className="mt-1 text-sm text-muted">Γράψε το email σου. Θα σου στείλουμε σύνδεσμο εισόδου — χωρίς κωδικούς.</p>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="onoma@sxoleio.gr"
                className={cx(inputClass, "h-11 text-base")}
              />
            </label>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy || !email.includes("@")}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Mail className="size-5" />} Στείλε μου σύνδεσμο
            </Button>
          </form>
        ) : (
          <div>
            <MailCheck className="size-10 text-brand-500" />
            <h1 className="mt-3 text-xl font-semibold tracking-[-0.02em]">Έλεγξε το email σου</h1>
            <p className="mt-1 text-sm text-muted">
              Στείλαμε σύνδεσμο στο <b className="text-ink">{email}</b>. Άνοιξέ τον από αυτή τη συσκευή. Αν δεν φαίνεται, κοίτα και στα ανεπιθύμητα.
            </p>
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim().length >= 6) void verify();
              }}
            >
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Ή γράψε τον κωδικό από το email</span>
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className={cx(inputClass, "h-11 flex-1 text-center text-lg tracking-[0.3em]")}
                />
                <Button type="submit" size="lg" disabled={busy || code.length < 6} aria-label="Είσοδος">
                  {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                </Button>
              </div>
            </form>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <button type="button" className="mt-4 text-sm font-semibold text-brand hover:underline" onClick={() => setSent(false)}>
              Άλλο email
            </button>
          </div>
        )}
      </Card>
      <button
        type="button"
        onClick={() => {
          startDemo();
          router.replace("/");
        }}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <PlayCircle className="size-5" /> Δοκίμασε χωρίς λογαριασμό
      </button>
      <p className="mt-2 max-w-xs text-center text-xs text-muted">Η επίδειξη έχει δείγματα δεδομένων και μένει μόνο σε αυτόν τον browser.</p>
      <p className="mt-6 max-w-xs text-center text-xs text-muted">
        Συνεχίζοντας αποδέχεσαι τους{" "}
        <Link href="/legal/terms" className="underline">
          Όρους χρήσης
        </Link>{" "}
        και την{" "}
        <Link href="/legal/privacy" className="underline">
          Πολιτική απορρήτου
        </Link>
        .
      </p>
      </div>
    </div>
  );
}

const PREVIEW = [
  { t: "08:15", s: "Γλώσσα", c: "Δ1", tp: "Ενότητα 3 · Ταξίδια", color: "bg-glossa", done: true },
  { t: "09:00", s: "Μαθηματικά", c: "Δ1", tp: "Κεφ. 12 · Κλάσματα", color: "bg-math", now: true },
  { t: "10:05", s: "Ιστορία", c: "Δ2", tp: "Ο μινωικός πολιτισμός", color: "bg-istoria" },
  { t: "10:50", s: "Μελέτη Περιβάλλοντος", c: "Δ1", tp: "Τα φυτά τρέφονται", color: "bg-meleti" },
];

/** Desktop only: a page of the teacher's day, like a notebook with a red margin. */
function DayPreview() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden border-r border-line bg-line-2/60 lg:flex lg:flex-col lg:justify-center lg:px-14">
      <div className="max-w-lg">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted">Δευτέρα 5 Οκτωβρίου</p>
        <h2 className="mt-3 text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink">
          Η μέρα σου, σε μία σελίδα<span className="text-now">.</span>
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
          Πρόγραμμα, παρουσίες, ύλη και φύλλα εργασίας μαζί. Γράφεις τι διδάχθηκε σε δέκα δευτερόλεπτα, τυπώνεις σε ένα.
        </p>
        <div className="relative mt-10 overflow-hidden rounded-xl border border-line bg-surface shadow-paper">
          <span className="absolute inset-y-0 left-[68px] w-px bg-now/40" />
          {PREVIEW.map((r) => (
            <div key={r.t} className={cx("relative flex items-center gap-4 border-b border-[#dbe2ec] px-4 py-3 last:border-b-0", r.done && "opacity-55")}>
              <span className={cx("w-11 font-mono text-[12px] tabular-nums", r.now ? "font-semibold text-now" : "text-muted")}>{r.t}</span>
              <span className={cx("size-1.5 shrink-0 rounded-full", r.color)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {r.s} <span className="font-medium text-muted">{r.c}</span>
                </span>
                <span className="block truncate text-[12.5px] text-ink-2">{r.tp}</span>
              </span>
              {r.now && <span className="rounded border border-now/30 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-now">ΤΩΡΑ</span>}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
