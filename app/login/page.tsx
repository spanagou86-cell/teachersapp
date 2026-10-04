"use client";

import { ArrowRight, Loader2, Mail, MailCheck, PlayCircle } from "lucide-react";
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-2" />
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
            <h1 className="text-xl font-extrabold">Σύνδεση</h1>
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
            <h1 className="mt-3 text-xl font-extrabold">Έλεγξε το email σου</h1>
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
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
