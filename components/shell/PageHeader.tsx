"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "../ui";
import { Logo } from "./AppShell";

/** Logo row shown on top-level mobile screens (desktop has the sidebar). */
export function MobileBrandBar() {
  return (
    <div className="mb-4 flex items-center justify-between lg:hidden">
      <Logo />
      <Link href="/about" aria-label="Προφίλ και πληροφορίες">
        <Avatar name="Σπύρος Π" seed={3} />
      </Link>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start gap-x-4 gap-y-3 lg:mb-6">
      {back && (
        <Link href={back} aria-label="Πίσω" className="-ml-1.5 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-line-2">
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-1 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-[32px] sm:leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}
