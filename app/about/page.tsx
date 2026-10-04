"use client";

import { CheckCircle2, CircleDashed, Crown, FlaskConical, RotateCcw, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, Card } from "@/components/ui";
import { useApp } from "@/lib/store";

const REAL = [
  "Ανέβασμα PDF, Word και φωτογραφιών (και από την κάμερα του κινητού) — το αρχείο αποθηκεύεται στη συσκευή σου",
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
  "Η ημερομηνία και η ώρα είναι σταθερές (Δευτέρα 5 Οκτωβρίου, 09:05) ώστε η ροή να ταιριάζει με το σενάριο επίδειξης",
  "Πακέτα και πληρωμές δεν έχουν συνδεθεί· η «Δοκιμή» είναι ενδεικτική",
  "Τα δεδομένα μένουν σε αυτόν τον browser — δεν υπάρχει λογαριασμός ή συγχρονισμός ανάμεσα σε κινητό και laptop",
];

const NEXT = [
  "Λογαριασμοί εκπαιδευτικών και βάση δεδομένων (π.χ. Supabase) για συγχρονισμό σε όλες τις συσκευές",
  "Ανάγνωση PDF/Word/φωτογραφιών και προσαρμογή με πραγματικό μοντέλο Claude",
  "Εισαγωγή ωρολογίου προγράμματος σχολείου και μαθητολογίου",
  "Πακέτα συνδρομής με Stripe",
];

export default function AboutPage() {
  const reset = useApp((s) => s.reset);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back="/" title="Τι λειτουργεί" subtitle="Πρωτότυπο της «τάξης» — τι είναι πραγματικό και τι ακόμη δείγμα." />
      <div className="space-y-5">
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
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm">
            <Crown className="size-4 text-amber" /> Τα πακέτα θα εμφανιστούν εδώ μόλις συνδεθούν οι πληρωμές.
          </div>
        </Card>
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
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
        </Card>
      </div>
    </div>
  );
}
