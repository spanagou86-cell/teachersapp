"use client";

import clsx from "clsx";
import { Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";

export { clsx as cx };

type Variant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover shadow-sm disabled:bg-brand/40",
  secondary: "bg-surface text-ink border border-line hover:bg-line-2 disabled:text-muted",
  ghost: "text-ink-2 hover:bg-line-2 disabled:text-muted",
  soft: "bg-brand-50 text-brand hover:bg-brand-100 disabled:opacity-50",
  danger: "bg-surface text-danger border border-line hover:bg-danger-50",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed select-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({ className, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-line-2 disabled:opacity-40", className)}
      {...props}
    />
  );
}

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-surface shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", className, children }: { tone?: "neutral" | "brand" | "amber" | "danger" | "info"; className?: string; children: ReactNode }) {
  const tones = {
    neutral: "bg-line-2 text-ink-2",
    brand: "bg-brand-50 text-brand",
    amber: "bg-amber-50 text-amber",
    danger: "bg-danger-50 text-danger",
    info: "bg-info-50 text-info",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={clsx("flex rounded-xl border border-line bg-surface p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex-1 rounded-lg px-2 font-medium transition-colors",
            size === "sm" ? "h-7 text-xs" : "h-9 text-sm",
            value === o.value ? "bg-brand-50 font-semibold text-brand shadow-[inset_0_0_0_1px_var(--color-brand-100)]" : "text-ink-2 hover:bg-line-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={clsx("flex gap-1 border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors sm:px-4",
            value === t.value ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-line")}
    >
      <span className={clsx("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={clsx("relative", className)}>
      <select
        className="h-10 w-full appearance-none rounded-xl border border-line bg-surface pl-3 pr-9 text-sm font-medium text-ink outline-none transition-colors hover:border-ink/20 focus:border-brand-500"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-ink/20 focus:border-brand-500";

const AVATAR_TONES = [
  "bg-glossa-50 text-glossa",
  "bg-meleti-50 text-meleti",
  "bg-math-50 text-amber",
  "bg-brand-50 text-brand",
  "bg-eikastika-50 text-eikastika",
  "bg-info-50 text-info",
];

export function Avatar({ name, seed = 0, size = "md" }: { name: string; seed?: number; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        AVATAR_TONES[seed % AVATAR_TONES.length],
        size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-12 text-base" : "size-10 text-sm",
      )}
    >
      {initials}
    </span>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={clsx(
          "relative flex max-h-[88dvh] w-full animate-slide-up flex-col rounded-t-3xl bg-surface shadow-pop sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line-2 px-5 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <IconButton label="Κλείσιμο" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CheckCircle({ checked, tone = "brand" }: { checked: boolean; tone?: "brand" | "danger" }) {
  if (checked)
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-500 text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  return <span className={clsx("inline-block size-7 rounded-full border-2", tone === "danger" ? "border-danger" : "border-line")} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
