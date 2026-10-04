"use client";

import { CalendarCog, CheckCircle2, CircleDashed, FlaskConical, LogIn, LogOut, RotateCcw, Rocket, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { flushWrites, useApp } from "@/lib/store";

const REAL = [
  "Λογαριασμός με email: τα δεδομένα σου αποθηκεύονται με ασφάλεια και φαίνονται σε κινητό και υπολογιστή",
  "Ωρολόγιο πρόγραμμα με μαθήματα, εφημερίες/παιδονομίες, κενά και συσκέψεις — δημιουργεί όλη τη σχολική χρονιά",
  "Σχολικό ημερολόγιο Ελλάδας και Κύπρου: αργίες (και του Πάσχα), διακοπές, τρίμηνα, αρίθμηση εβδομάδων",
  "Ημερολόγιο σε όψη εβδομάδας, μήνα και χρονιάς",
  "Παρουσίες με ένα πάτημα (παρών / απών / καθυστέρηση) και καρτέλα μαθητή με σημειώσεις και επαφές με γονείς",
  "Φωτεινό θέμα ή θέμα συσκευής (και σκούρο), μεγάλα γράμματα",
  "Ανέβασμα PDF, Word και φωτογραφιών (και από την κάμερα του κινητού)",
  "Υλικό οργανωμένο ανά τμήμα και μάθημα, με αναζήτηση και φίλτρα",
  "Επεξεργασία φύλλου: κείμενο, λύσεις, σειρά ασκήσεων, αναίρεση/επανάληψη",
  "Ιστορικό αλλαγών με επαναφορά οποιασδήποτε έκδοσης ή του πρωτοτύπου",
  "Σύνδεση υλικού με συγκεκριμένη διδακτική ώρα",
  "Καταγραφή «τι διδάχθηκε» και κατάστασης μαθήματος",
  "Μεταφορά μαθήματος που δεν ολοκληρώθηκε, με έλεγχο συγκρούσεων ωρών και αναίρεση",
  "Παρουσίες ανά ημέρα, σύνολα απουσιών και πρόοδος ύλης ανά τμήμα",
  "Σημειώσεις τμήματος, λίστα «Για σήμερα», εκτύπωση / PDF (φύλλο μαθητή και λύσεων)",
];

const AI = [
  "Δημιουργία φύλλου, τεστ, σχεδίου μαθήματος ή περίληψης από PDF, Word (.docx) ή φωτογραφία σελίδας, για την τάξη και το επίπεδο που διαλέγεις",
  "Προσαρμογή με δικά σου λόγια: πιο απλό, πιο απαιτητικό, λύσεις, εκδοχή Α/Β, μόνο μία άσκηση",
  "Ανάγνωση του ωρολογίου προγράμματος του σχολείου από φωτογραφία ή PDF",
  "Ό,τι φτιάχνει το AI το ελέγχεις πριν το μοιράσεις· το πρωτότυπο μένει ανέγγιχτο και κάθε αλλαγή μπαίνει στο ιστορικό",
];

const DEMO = [
  "Στην επίδειξη χωρίς λογαριασμό η ημερομηνία είναι σταθερή (Δευτέρα 5 Οκτωβρίου, 09:05) και τα δεδομένα μένουν μόνο στον browser",
  "Στην επίδειξη το AI αντικαθίσταται από απλούς κανόνες και έτοιμα παραδείγματα",
];

const NEXT = [
  "Βιβλίο ύλης και ετήσιος προγραμματισμός ύλης, έτοιμα για εκτύπωση",
  "Αξιολόγηση και αναφορές προόδου ανά μαθητή",
];

export default function AboutPage() {
  const reset = useApp((s) => s.reset);
  const mode = useApp((s) => s.mode);
  const email = useApp((s) => s.email);
  const profile = useApp((s) => s.profile);
  const leave = useApp((s) => s.leave);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back="/settings" title="Τι λειτουργεί" subtitle="Όλες οι δυνατότητες της «τάξης» και τι έρχεται." />
      <div className="space-y-5">
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-bold">{mode === "cloud" ? profile.displayName || "Ο λογαριασμός σου" : "Επίδειξη χωρίς λογαριασμό"}</p>
            <p className="text-sm text-muted">{mode === "cloud" ? [email, profile.schoolName].filter(Boolean).join(" · ") : "Τα δεδομένα είναι δείγματα και μένουν σε αυτόν τον browser."}</p>
          </div>
          {mode === "cloud" ? (
            <div className="flex gap-2">
              <ButtonLink href="/settings/timetable" variant="secondary">
                <CalendarCog className="size-4" /> Ωρολόγιο
              </ButtonLink>
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
            </div>
          ) : (
            <Button
              onClick={() => {
                leave();
                router.replace("/login");
              }}
            >
              <LogIn className="size-4" /> Δημιούργησε λογαριασμό
            </Button>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 className="size-5 text-brand-500" /> Λειτουργεί πραγματικά
          </h2>
          <ul className="space-y-2 text-[15px]">
            {REAL.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" /> {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-brand-500" /> Με τη βοήθεια AI
          </h2>
          <ul className="space-y-2 text-[15px]">
            {AI.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" /> {r}
              </li>
            ))}
          </ul>
        </Card>
        {mode !== "cloud" && (
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <FlaskConical className="size-5 text-amber" /> Στην επίδειξη
            </h2>
            <ul className="space-y-2 text-[15px]">
              {DEMO.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" /> {r}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card className="p-5" id="plans">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Rocket className="size-5 text-info" /> Έρχονται σύντομα
          </h2>
          <ul className="space-y-2 text-[15px]">
            {NEXT.map((r) => (
              <li key={r} className="flex gap-2">
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" /> {r}
              </li>
            ))}
          </ul>
        </Card>
        {mode === "demo" && <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-bold">Επαναφορά επίδειξης</p>
            <p className="text-sm text-muted">Σβήνει τις αλλαγές σου και ξεκινά από την αρχή.</p>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm("Να σβηστούν όλες οι αλλαγές της επίδειξης;")) return;
              reset();
              toast("Η επίδειξη ξεκίνησε από την αρχή");
              router.push("/");
            }}
          >
            <RotateCcw className="size-4" /> Επαναφορά
          </Button>
        </Card>}
      </div>
    </div>
  );
}
