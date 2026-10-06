"use client";

import { MoreHorizontal } from "@/components/icons";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "./ui";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
}

/** «⋯»: the less frequent actions of a screen, out of the way until needed. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const cls = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-line-2 [&>svg]:size-4 [&>svg]:text-muted";
  return (
    <div ref={ref} className="relative">
      <IconButton label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="border border-line bg-surface">
        <MoreHorizontal className="size-5" />
      </IconButton>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-60 animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-pop">
          {items.map((it) =>
            it.href ? (
              <Link key={it.label} role="menuitem" href={it.href} onClick={() => setOpen(false)} className={cls}>
                {it.icon}
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
                className={cls}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
