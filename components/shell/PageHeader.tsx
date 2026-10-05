"use client";

import { ArrowLeft, Settings } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { canGoBack } from "@/lib/history";
import { useApp } from "@/lib/store";
import { Avatar } from "../ui";
import { Logo } from "./AppShell";

/** Top of the main screens on phones: logo, the teacher's school, and settings one tap away. */
export function MobileBrandBar() {
  const name = useApp((s) => s.profile.displayName);
  const school = useApp((s) => s.profile.schoolName);
  return (
    <div className="mb-4 flex items-center gap-3 lg:hidden">
      <div className="min-w-0 flex-1">
        <Logo />
        {school && <p className="mt-0.5 truncate text-[13px] text-muted">{school}</p>}
      </div>
      <Link
        href="/settings"
        aria-label="Ρυθμίσεις: σχολείο, προφίλ, εμφάνιση"
        className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface pl-1 pr-3 text-[13px] font-semibold text-ink-2 active:bg-line-2"
      >
        <Avatar name={name || "?"} seed={3} size="sm" />
        <Settings className="size-4" />
      </Link>
    </div>
  );
}

/** Goes back to where the teacher came from inside the app, or to the page's parent. */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Πίσω"
      onClick={() => (canGoBack() ? router.back() : router.push(fallback))}
      className={
        className ?? "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-line-2 active:bg-line-2"
      }
    >
      <ArrowLeft className="size-5" />
    </button>
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
    <div className="mb-5 flex flex-wrap items-start gap-x-3 gap-y-3 lg:mb-6">
      {back && <BackButton fallback={back} />}
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-1 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="break-words text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}
