"use client";

import clsx from "clsx";
import {
  ArrowRight,
  BookOpenCheck,
  Camera,
  Check,
  ClipboardCheck,
  Lock,
  Paperclip,
  PlayCircle,
  Presentation,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
} from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shell/AppShell";
import { useApp } from "@/lib/store";

/** The front door: what «τάξη» does for a primary teacher in Cyprus, in one scroll. */
export default function WelcomePage() {
  const router = useRouter();
  const startDemo = useApp((s) => s.startDemo);
  const demo = () => {
    startDemo();
    router.replace("/");
  };

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span className="flex-1" />
          <Link href="#times" className="hidden text-[14px] font-semibold text-ink-2 hover:text-ink sm:block">
            Τιμές
          </Link>
          <Link href="/login" className="rounded-xl px-3 py-2 text-[14px] font-semibold text-ink-2 hover:bg-line-2 hover:text-ink">
            Σύνδεση
          </Link>
          <Link href="/login" className="rounded-xl bg-brand px-3.5 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover">
            Ξεκίνα δωρεάν
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#14275f_0%,#1e3a8a_55%,#2c4fb0_100%)] text-white">
        <span aria-hidden className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)]" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(180deg,black,transparent_90%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid gap-6">
            <p className="text-[12.5px] font-semibold tracking-[0.16em] text-white/65">ΓΙΑ ΔΑΣΚΑΛΟΥΣ ΔΗΜΟΤΙΚΟΥ · ΚΥΠΡΟΣ</p>
            <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-[58px]">
              Η εβδομάδα σου, έτοιμη σε <span className="text-amber-300">10 λεπτά</span>.
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-white/80 sm:text-[19px]">
              Φωτογράφισε τη σελίδα του βιβλίου και η «τάξη» φτιάχνει το μάθημα: σχέδιο, φύλλο εργασίας, τεστ. Μαζί το πρόγραμμα, οι παρουσίες, η ΣΕΠ και ο
              προγραμματισμός για τον Διευθυντή, σε ένα μέρος.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90">
                Ξεκίνα 30 μέρες δωρεάν <ArrowRight className="size-4" />
              </Link>
              <button type="button" onClick={demo} className="flex h-12 items-center gap-2 rounded-xl bg-white/12 px-5 text-[16px] font-semibold ring-1 ring-white/25 hover:bg-white/20">
                <PlayCircle className="size-5" /> Δες την εφαρμογή τώρα
              </button>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" /> Χωρίς κάρτα
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" /> Κινητό και υπολογιστής
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" /> Ημερολόγιο και ώρες Κύπρου
              </span>
            </p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="ΠΩΣ ΔΟΥΛΕΥΕΙ" title="Από τη σελίδα του βιβλίου στο έτοιμο μάθημα" />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { Icon: Camera, t: "Φωτογραφίζεις τις σελίδες", d: "Μία ή περισσότερες, από το βιβλίο ή το τετράδιο εργασιών. Ή γράφεις με δικά σου λόγια τι θέλεις." },
            { Icon: Sparkles, t: "Αναγνωρίζει το μάθημα", d: "Μάθημα, τάξη, ενότητα, σελίδες και στόχους. Κάθε μάθημα φτιάχνεται με τους δικούς του κανόνες." },
            { Icon: Presentation, t: "Τυπώνεις ή το βάζεις στον πίνακα", d: "Φύλλο με λύσεις, τεστ, 3 επίπεδα ή όλο το μάθημα, μέσα στο πρόγραμμά σου. Αλλάζεις ό,τι θέλεις." },
          ].map(({ Icon, t, d }, i) => (
            <li key={t} className="relative grid gap-3 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <span className="absolute right-5 top-5 text-[44px] font-semibold leading-none tracking-[-0.04em] text-line">{i + 1}</span>
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{t}</h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionTitle eyebrow="ΟΛΑ ΣΕ ΕΝΑ ΜΕΡΟΣ" title="Ό,τι κάνεις κάθε εβδομάδα, χωρίς χαρτούρα" />
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Feature className="md:col-span-4" Icon={Timer} title="Η εβδομάδα σε 10 λεπτά" tone="brand">
              Όλα τα μαθήματα της επόμενης εβδομάδας σε μία λίστα, με τα θέματα ήδη από την ύλη. Ένα πάτημα: υλικό για όλα και στόχοι για τον προγραμματισμό.
            </Feature>
            <Feature className="md:col-span-2" Icon={Presentation} title="Στον πίνακα">
              Μία άσκηση τη φορά, «Δείξε τη λύση», χρονόμετρο και «Ποιος απαντά;».
            </Feature>
            <Feature className="md:col-span-2" Icon={ClipboardCheck} title="ΣΕΠ σε λεπτά">
              Στη μορφή του εντύπου του ΥΠΑΝ, ★ με ένα άγγιγμα, προσχέδια σχολίων και απουσίες από τις παρουσίες.
            </Feature>
            <Feature className="md:col-span-2" Icon={BookOpenCheck} title="Προγραμματισμός για τον Διευθυντή">
              Εβδομαδιαίος ή δεκαπενθήμερος (Κ.Δ.Π. 168/2024, άρθρο 39), σε Α4 με υπογραφές.
            </Feature>
            <Feature className="md:col-span-2" Icon={UserCheck} title="Ποιος δυσκολεύτηκε">
              ✓ · ~ · ✗ μετά το μάθημα, φύλλο ενίσχυσης για το επόμενο, και η πρόοδος κάθε παιδιού.
            </Feature>
            <Feature className="md:col-span-3" Icon={Paperclip} title="Φυλλάδια και υλικό">
              Τα φυλλάδια κάθε τάξης ανά μάθημα, έτοιμα για φωτοτυπία με ένα πάτημα. Κάθε φύλλο ως αληθινό Α4, με φύλλο λύσεων και εκτύπωση για δυσλεξία.
            </Feature>
            <Feature className="md:col-span-3" Icon={ShieldCheck} title="Παρουσίες και παιδονομία">
              Παρουσίες με ένα πάτημα ανά παιδί και ειδοποίηση στο κινητό 5′ πριν από κάθε παιδονομία.
            </Feature>
          </div>
        </div>
      </section>

      {/* Cyprus + time */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
        <div className="grid content-start gap-4 rounded-3xl bg-[linear-gradient(135deg,#14275f,#1e3a8a_60%,#2c4fb0)] p-7 text-white">
          <p className="text-[12.5px] font-semibold tracking-[0.16em] text-white/65">ΧΡΟΝΟΣ</p>
          <p className="text-[52px] font-semibold leading-none tracking-[-0.04em]">
            3–4 <span className="text-[26px] tracking-[-0.02em] text-white/75">ώρες την εβδομάδα</span>
          </p>
          <p className="text-[15px] leading-relaxed text-white/80">
            Τόσες εκτιμάμε ότι γλιτώνει ένας δάσκαλος σε φύλλα, τεστ, προγραμματισμό και ΣΕΠ. Η Αρχική σού δείχνει κάθε εβδομάδα πόσο χρόνο γλίτωσες.
          </p>
        </div>
        <div className="grid content-start gap-4 rounded-3xl border border-line bg-surface p-7 shadow-card">
          <p className="text-[12.5px] font-semibold tracking-[0.16em] text-muted">ΦΤΙΑΓΜΕΝΗ ΓΙΑ ΤΗΝ ΚΥΠΡΟ</p>
          <ul className="grid gap-2.5 text-[15px]">
            {[
              "Σχολικό ημερολόγιο του ΥΠΑΝ, με την τοπική γιορτή του σχολείου σου",
              "Το κουδούνι της Κύπρου (07:45, 40′) και τα τρία διαλείμματα",
              "Τα μαθήματα με τα ονόματα του Αναλυτικού Προγράμματος",
              "ΣΕΠ στη μορφή του εντύπου ΔΔΕ Π12",
              "Ενδεικτικοί προγραμματισμοί Μαθηματικών και ύλη που μπαίνει μόνη της",
            ].map((x) => (
              <li key={x} className="flex gap-2.5">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-500" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center md:col-span-2">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Lock className="size-5" />
          </span>
          <p className="min-w-0 text-[15px] leading-relaxed text-ink-2 sm:flex-1">
            <b className="text-ink">Τα ονόματα των παιδιών δεν πηγαίνουν ποτέ στο AI.</b> Τα δεδομένα σου φυλάσσονται στην ΕΕ (Φρανκφούρτη), σύμφωνα με τον ΓΚΠΔ, και τα
            κατεβάζεις ή τα σβήνεις όποτε θέλεις.
          </p>
          <Link href="/legal/privacy" className="text-[14px] font-semibold text-brand-500 hover:underline">
            Πολιτική απορρήτου
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="times" className="scroll-mt-20 border-t border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionTitle eyebrow="ΤΙΜΕΣ" title="Απλές τιμές, για όλη τη σχολική χρονιά" sub="Ξεκινάς με 30 μέρες όλα ανοιχτά, χωρίς κάρτα." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Plan name="Δωρεάν" price="€0" per="για πάντα" items={["Πρόγραμμα, Αρχική και παρουσίες", "Υπενθυμίσεις παιδονομίας", "10 δημιουργίες AI τον μήνα", "Προγραμματισμός για τον Διευθυντή"]} cta="Ξεκίνα" />
            <Plan
              name="Pro"
              price="€49"
              per="τη σχολική χρονιά · ή €6,99 τον μήνα"
              highlight
              items={["Όλα τα δωρεάν", "AI χωρίς όριο, και από σελίδες βιβλίου", "Η εβδομάδα σε 10 λεπτά", "ΣΕΠ με προσχέδια σχολίων", "Στον πίνακα, φυλλάδια, πλήρες αρχείο"]}
              cta="30 μέρες δωρεάν"
            />
            <Plan name="Σχολείο" price="€35" per="ανά δάσκαλο, τον χρόνο · από 5" items={["Όλα τα Pro για κάθε δάσκαλο", "Μία πληρωμή για το σχολείο", "Βοήθεια στο ξεκίνημα"]} cta="Ξεκίνα με το σχολείο σου" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionTitle eyebrow="ΕΡΩΤΗΣΕΙΣ" title="Συχνές ερωτήσεις" />
        <div className="mt-8 grid gap-2">
          {[
            ["Χρειάζεται να εγκαταστήσω κάτι;", "Όχι. Ανοίγει σε κινητό, tablet και υπολογιστή. Στο κινητό μπορείς να την προσθέσεις στην αρχική οθόνη σαν εφαρμογή, και δουλεύει και χωρίς σύνδεση."],
            ["Ακολουθεί το Αναλυτικό Πρόγραμμα της Κύπρου;", "Ναι. Ορολογία, μαθήματα, ημερολόγιο και έντυπα είναι της Κύπρου, και το AI φτιάχνει υλικό με βάση το θέμα και τις σελίδες του δικού σου βιβλίου. Ό,τι φτιάχνει το ελέγχεις πριν το μοιράσεις."],
            ["Τι γίνεται με τα δεδομένα των παιδιών;", "Τα ονόματα, οι παρουσίες και οι σημειώσεις μένουν στον λογαριασμό σου, στην ΕΕ. Στο AI πηγαίνει μόνο το μάθημα, το θέμα και ό,τι γράψεις εσύ."],
            ["Μπορώ να τη δοκιμάσω πριν κάνω λογαριασμό;", "Ναι: πάτησε «Δες την εφαρμογή τώρα» για μια επίδειξη με ένα σχολείο-παράδειγμα, χωρίς email."],
          ].map(([q, a]) => (
            <Faq key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* Final call */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-3xl bg-[linear-gradient(135deg,#14275f,#1e3a8a_60%,#2c4fb0)] p-8 text-white sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] [text-wrap:balance] sm:text-[38px]">Κέρδισε πίσω τα απογεύματά σου.</h2>
            <p className="mt-2 text-[16px] text-white/80">30 μέρες όλα ανοιχτά. Χωρίς κάρτα, χωρίς δέσμευση.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90">
              Ξεκίνα δωρεάν <ArrowRight className="size-4" />
            </Link>
            <button type="button" onClick={demo} className="flex h-12 items-center gap-2 rounded-xl bg-white/12 px-5 text-[16px] font-semibold ring-1 ring-white/25 hover:bg-white/20">
              Επίδειξη
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-8 text-[13.5px] text-muted sm:px-6">
          <Logo />
          <span className="flex-1" />
          <Link href="/legal/privacy" className="hover:text-ink">
            Απόρρητο
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            Όροι χρήσης
          </Link>
          <Link href="/legal/dpa" className="hover:text-ink">
            Σύμβαση επεξεργασίας
          </Link>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-3 text-center">
      <p className="text-[12.5px] font-semibold tracking-[0.16em] text-brand-500">{eyebrow}</p>
      <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] [text-wrap:balance] sm:text-[40px]">{title}</h2>
      {sub && <p className="text-[16px] text-ink-2">{sub}</p>}
    </div>
  );
}

function Feature({ Icon, title, children, className, tone }: { Icon: typeof Timer; title: string; children: React.ReactNode; className?: string; tone?: "brand" }) {
  return (
    <div className={clsx("grid content-start gap-3 rounded-2xl border p-6 shadow-card", tone === "brand" ? "border-brand-100 bg-brand-50" : "border-line bg-surface", className)}>
      <span className={clsx("flex size-11 items-center justify-center rounded-xl", tone === "brand" ? "bg-brand text-white" : "bg-brand-50 text-brand")}>
        <Icon className="size-5" />
      </span>
      <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="text-[15px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function Plan({ name, price, per, items, cta, highlight }: { name: string; price: string; per: string; items: string[]; cta: string; highlight?: boolean }) {
  return (
    <div className={clsx("relative grid content-start gap-5 rounded-3xl border p-7", highlight ? "border-brand bg-surface shadow-lift ring-1 ring-brand" : "border-line bg-surface shadow-card")}>
      {highlight && <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white">Οι περισσότεροι</span>}
      <div>
        <p className="text-[15px] font-semibold text-ink-2">{name}</p>
        <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.04em]">{price}</p>
        <p className="mt-2 text-[13.5px] text-muted">{per}</p>
      </div>
      <ul className="grid gap-2 text-[14.5px]">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-500" /> {x}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={clsx("flex h-11 items-center justify-center rounded-xl text-[15px] font-semibold", highlight ? "bg-brand text-white hover:bg-brand-hover" : "border border-line hover:bg-line-2")}
      >
        {cta}
      </Link>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left text-[16px] font-semibold">
        <span className="min-w-0 flex-1">{q}</span>
        <span className={clsx("text-[22px] leading-none text-muted transition-transform", open && "rotate-45")}>+</span>
      </button>
      {open && <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{a}</p>}
    </div>
  );
}

/** A glimpse of the app, drawn in HTML: the «now» card and a sheet made from a book page. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -left-4 top-10 w-[62%] rotate-[-5deg] rounded-lg bg-white p-4 text-ink shadow-[0_30px_60px_-20px_rgb(5_10_30/0.6)]">
        <div className="mb-3 flex items-center justify-between border-b border-line pb-2 text-[10px] text-muted">
          <span className="font-semibold">Δημοτικό Σχολείο · Δ΄</span>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 font-semibold text-brand">Επίπεδο Β</span>
        </div>
        <p className="mb-2 text-center text-[13px] font-semibold">Ισοδύναμα κλάσματα</p>
        {["Χρωμάτισε τα 2/4 του σχήματος.", "Συμπλήρωσε: 1/2 = □/6", "Ποιο είναι μεγαλύτερο: 3/4 ή 2/3;"].map((t, i) => (
          <div key={t} className="mb-2">
            <p className="text-[10.5px]">
              <b>{i + 1}.</b> {t}
            </p>
            <div className="mt-1.5 h-px bg-line" />
            <div className="mt-2 h-px bg-line" />
          </div>
        ))}
      </div>
      <div className="relative ml-auto mt-24 w-[78%] rounded-2xl bg-surface p-4 text-ink shadow-[0_30px_60px_-20px_rgb(5_10_30/0.7)]">
        <p className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.12em] text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-now/60" />
            <span className="relative inline-flex size-2 rounded-full bg-now" />
          </span>
          ΤΩΡΑ
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-math-50 text-math">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight">Μαθηματικά · Δ1</p>
            <p className="truncate text-[12px] text-ink-2">Ισοδύναμα κλάσματα</p>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-semibold leading-none tracking-[-0.03em]">25′</p>
            <p className="text-[10.5px] text-muted">μένουν</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-2">
          <span className="block h-full w-[38%] rounded-full bg-math" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold">
          <span className="flex h-8 items-center justify-center gap-1 rounded-lg border border-line">
            <Presentation className="size-3.5" /> Στον πίνακα
          </span>
          <span className="flex h-8 items-center justify-center rounded-lg bg-brand text-white">Άνοιγμα</span>
        </div>
      </div>
      <div className="absolute -bottom-6 right-4 flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-lift">
        <Timer className="size-3.5" /> Γλίτωσες ~3 ώ 20′ αυτή την εβδομάδα
      </div>
    </div>
  );
}
