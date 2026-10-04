import Link from "next/link";
import type { ReactNode } from "react";
import { COMPANY, LEGAL_UPDATED } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 text-[15px] leading-relaxed text-ink-2 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <Link href="/" className="text-sm font-semibold text-brand-500 hover:underline">
        ← τάξη
      </Link>
      <h1 className="mt-4 text-[28px] font-extrabold leading-tight text-ink">{title}</h1>
      <p className="text-sm text-muted">Τελευταία ενημέρωση: {LEGAL_UPDATED}</p>
      {children}
      <nav className="mt-10 flex flex-wrap gap-4 border-t border-line pt-4 text-sm font-semibold text-brand-500">
        <Link href="/legal/privacy">Πολιτική απορρήτου</Link>
        <Link href="/legal/terms">Όροι χρήσης</Link>
        <Link href="/legal/dpa">Σύμβαση επεξεργασίας δεδομένων</Link>
      </nav>
    </article>
  );
}

export function Provider() {
  const parts = [COMPANY.name, COMPANY.address, COMPANY.vat && `ΑΦΜ ${COMPANY.vat}`].filter(Boolean).join(", ");
  return (
    <>
      {parts}
      {COMPANY.email && (
        <>
          {" "}
          (email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>)
        </>
      )}
    </>
  );
}

export const contact = COMPANY.email ? `στο ${COMPANY.email}` : "μέσα από τη σελίδα «Σχολείο & χρονιά» της εφαρμογής";
