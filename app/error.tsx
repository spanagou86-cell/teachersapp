"use client";

import { RotateCcw, TriangleAlert } from "@/components/icons";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto mt-20 max-w-sm px-4 text-center">
      <TriangleAlert className="mx-auto size-10 text-amber" />
      <h1 className="mt-3 text-xl font-semibold tracking-[-0.02em]">Κάτι πήγε στραβά</h1>
      <p className="mt-1 text-sm text-muted">Τα δεδομένα σου είναι ασφαλή. Δοκίμασε ξανά ή γύρνα στην αρχική.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white hover:bg-brand-hover">
          <RotateCcw className="size-4" /> Ξαναδοκίμασε
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-4 font-semibold hover:bg-line-2">
          Αρχική
        </Link>
      </div>
    </div>
  );
}
