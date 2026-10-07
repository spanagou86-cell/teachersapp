"use client";

import { CalendarCog, CheckCircle2, CircleDashed, FlaskConical, LogIn, LogOut, RotateCcw, Rocket, Sparkles } from "@/components/icons";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { flushWrites, useApp } from "@/lib/store";
import { confirmAction } from "@/components/confirm";

const REAL = [
  "Λογαριασμός με email: τα δεδομένα σου αποθηκεύονται με ασφάλεια και φαίνονται σε κινητό και υπολογιστή",
  "Ωρολόγιο πρόγραμμα με μαθήματα, εφημερίες/παιδονομίες, κενά και συσκέψεις, έτοιμες ώρες κουδουνιού Ελλάδας και Κύπρου — δημιουργεί όλη τη σχολική χρονιά",
  "Σχολικό ημερολόγιο Κύπρου ακριβώς όπως το ανακοινώνει το Υπουργείο (αργίες, διακοπές, έναρξη και λήξη), συν η τοπική γιορτή του σχολείου σου· ημερολόγιο Ελλάδας",
  "Τα μαθήματα με τα ονόματα κάθε χώρας: Ελληνικά, Τέχνη, Αγωγή Ζωής, Κοινωνική και Πολιτική Αγωγή κ.ά. για την Κύπρο",
  "Πρόγραμμα σε όψη εβδομάδας, μήνα και χρονιάς",
  "«Αρχική» με το «τώρα»: το μάθημα που τρέχει ή το επόμενο με αντίστροφη μέτρηση, η μέρα σε μια μπάρα, η εβδομάδα με μια ματιά και το επόμενο βήμα",
  "Ύλη που προχωράει μόνη της: δίνεις μία φορά την ύλη (ή φωτογραφίζεις τα περιεχόμενα του βιβλίου) και τα θέματα μπαίνουν στα μαθήματα ως τον Ιούνιο· οι επίσημοι προγραμματισμοί Μαθηματικών Κύπρου",
  "Εβδομαδιαίος ή δεκαπενθήμερος προγραμματισμός για τον Διευθυντή (Κ.Δ.Π. 168/2024, άρθρο 39), σε Α4 με υπογραφές",
  "Σχολική Έκθεση Προόδου (ΣΕΠ) στη μορφή του εντύπου του ΥΠΑΝ: ★ με ένα άγγιγμα, «όλη η τάξη ★★★», απουσίες ανά τετράμηνο από τις παρουσίες",
  "«Κλείσε τη μέρα» σε ένα λεπτό και ειδοποίηση στο κινητό 5′ πριν από κάθε παιδονομία/εφημερία",
  "Φυλλάδια: τα τυπωμένα φυλλάδια κάθε τάξης, ανά μάθημα, έτοιμα για φωτοτυπία με ένα πάτημα",
  "Παρουσίες με ένα πάτημα (παρών / απών / καθυστέρηση) και καρτέλα μαθητή με σημειώσεις και επαφές με γονείς",
  "Ανέβασμα PDF, Word και φωτογραφιών (και από την κάμερα του κινητού), που μπαίνουν κατευθείαν στη βιβλιοθήκη και στο μάθημα",
  "Υλικό οργανωμένο ανά τμήμα και μάθημα, με αναζήτηση (και στο κινητό) και φίλτρα",
  "Επεξεργασία φύλλου: κείμενο, λύσεις, σειρά ασκήσεων, αναίρεση/επανάληψη",
  "Ιστορικό αλλαγών με επαναφορά οποιασδήποτε έκδοσης ή του πρωτοτύπου, αναίρεση σε κάθε διαγραφή",
  "«Πώς πήγε;» και «τι διδάχθηκε» σε κάθε μάθημα, ύλη που διδάχθηκε και εβδομαδιαίος προγραμματισμός έτοιμα για εκτύπωση",
  "Μεταφορά μαθήματος που δεν ολοκληρώθηκε, με έλεγχο συγκρούσεων ωρών και αναίρεση",
  "Παρουσίες ανά ημέρα, σύνολα απουσιών και πρόοδος ύλης ανά τμήμα",
  "Σημειώσεις τμήματος, λίστα «Εκκρεμότητες», εκτύπωση / PDF (φύλλο μαθητή και λύσεων)",
  "Μεγάλα γράμματα, εγκατάσταση στην αρχική οθόνη, λειτουργία και χωρίς σύνδεση",
];

const AI = [
  "«✨ Ετοίμασε» στο κέντρο της εφαρμογής: φύλλο εργασίας (τουλάχιστον 5 ασκήσεις), τεστ 10′, 3 επίπεδα (Α, Β, Γ), σχέδιο μαθήματος ή «Όλο το μάθημα» (σχέδιο, φύλλο και τεστ εξόδου μαζί)",
  "Από τις σελίδες του βιβλίου (έως 6 φωτογραφίες ή PDF): το AI αναγνωρίζει μάθημα, τάξη, ενότητα, σελίδες και στόχους και φτιάχνει νέες ασκήσεις στο ίδιο πνεύμα",
  "Κάθε μάθημα με τους δικούς του κανόνες: Ελληνικά, Μαθηματικά, Ιστορία, Αγγλικά κ.ά. — και με δικά σου λόγια στο «Τι να περιέχει;»",
  "Ορολογία και παραδείγματα της χώρας σου· το αποτέλεσμα μπαίνει μόνο του στο μάθημα και στη βιβλιοθήκη",
  "«Άλλαξέ το»: μία ακόμη άσκηση, πιο απλό, πιο απαιτητικό, λύσεις, δεύτερη εκδοχή, ή «βάλε άλλη μια ερώτηση» — η πρόταση φαίνεται πάνω στο φύλλο πριν την εφαρμόσεις",
  "Προσχέδια σχολίων για τη ΣΕΠ και στόχοι για τον προγραμματισμό, χωρίς ονόματα παιδιών στο AI",
  "Ανάγνωση του ωρολογίου προγράμματος και της λίστας μαθητών από φωτογραφία ή PDF",
  "Για να φτιάξει υλικό, το AI παίρνει μόνο το μάθημα, το θέμα και ό,τι του γράψεις — όχι ονόματα μαθητών, παρουσίες ή σημειώσεις. Ό,τι φτιάχνει το ελέγχεις πριν το μοιράσεις",
];

const DEMO = [
  "Στην επίδειξη χωρίς λογαριασμό η ημερομηνία είναι σταθερή (Δευτέρα 5 Οκτωβρίου, 09:10) και τα δεδομένα μένουν μόνο στον browser",
  "Στην επίδειξη το AI αντικαθίσταται από έτοιμα παραδείγματα και απλούς κανόνες",
];

const NEXT = [
  "«Η εβδομάδα σε 10 λεπτά»: όλο το υλικό και ο προγραμματισμός της επόμενης εβδομάδας με ένα πάτημα",
  "«Στην τάξη» στον πίνακα: μία άσκηση τη φορά, λύση, χρονόμετρο, τεστ εξόδου",
  "Πόσο χρόνο γλίτωσες κάθε εβδομάδα",
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
            onClick={async () => {
              const yes = await confirmAction({ title: "Επαναφορά επίδειξης;", text: "Σβήνονται όλες οι αλλαγές που έκανες στην επίδειξη.", action: "Επαναφορά", danger: true });
              if (!yes) return;
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
