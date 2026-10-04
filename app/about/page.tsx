"use client";

import { CalendarCog, CheckCircle2, CircleDashed, FlaskConical, LogIn, LogOut, RotateCcw, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

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

const MOCK = [
  "Η προσαρμογή με AI είναι δείγμα: καταλαβαίνει βασικές οδηγίες (πιο απλό/δύσκολο, άσκηση Ν, λύσεις, χώρος, εκδοχή Α/Β) και δεν διαβάζει ακόμη το περιεχόμενο του αρχείου",
  "Στην επίδειξη χωρίς λογαριασμό η ημερομηνία είναι σταθερή (Δευτέρα 5 Οκτωβρίου, 09:05) και τα δεδομένα μένουν μόνο στον browser",
];

const NEXT = [
  "Αυτόματη συμπλήρωση του ωρολογίου από φωτογραφία του προγράμματος του σχολείου",
  "Ανάγνωση PDF/Word/φωτογραφιών και προσαρμογή με πραγματικό μοντέλο Claude",
  "Βιβλίο ύλης και ετήσιος προγραμματισμός ύλης, έτοιμα για εκτύπωση",
  "Πακέτα συνδρομής με Stripe",
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
      <PageHeader back="/settings" title="Τι λειτουργεί" subtitle="Πρωτότυπο της «τάξης» — τι είναι πραγματικό και τι ακόμη δείγμα." />
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
            <FlaskConical className="size-5 text-amber" /> Δείγμα επίδειξης
          </h2>
          <ul className="space-y-2 text-[15px]">
            {MOCK.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" /> {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5" id="plans">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Rocket className="size-5 text-info" /> Επόμενα βήματα
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
