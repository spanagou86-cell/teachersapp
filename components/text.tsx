"use client";

import clsx from "clsx";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";

/** Sets a textarea's height to its content, so nothing is ever hidden behind a scrollbar. */
function fit(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

/** A textarea that grows with its text (controlled, like a normal textarea). */
export const GrowingTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function GrowingTextarea(
  { className, value, onChange, rows = 2, ...props },
  outer,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(outer, () => ref.current!);
  useLayoutEffect(() => fit(ref.current), [value]);
  useEffect(() => {
    const onResize = () => fit(ref.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        fit(e.currentTarget);
      }}
      className={clsx("resize-none overflow-hidden", className)}
      {...props}
    />
  );
});

/**
 * Text that saves itself: as the teacher types (after a short pause), when they leave the
 * field, and when the app goes to the background or closes. Nothing typed is ever lost.
 */
export function AutoText({
  value,
  onSave,
  multiline,
  allowEmpty,
  delay = 600,
  maxLength,
  className,
  placeholder,
  label,
  onEnter,
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  /** Empty text is saved (e.g. clearing a topic); otherwise leaving it empty restores the old text. */
  allowEmpty?: boolean;
  delay?: number;
  maxLength?: number;
  className?: string;
  placeholder?: string;
  label: string;
  onEnter?: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ draft, value, onSave, allowEmpty });
  latest.current = { draft, value, onSave, allowEmpty };

  // Follow changes made elsewhere, but never while the teacher is typing.
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const { draft: d, value: v, onSave: save, allowEmpty: empty } = latest.current;
    const next = multiline ? d.replace(/\s+$/, "") : d.trim();
    if (next === v) return;
    if (!next && !empty) return;
    save(next);
  }, [multiline]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const change = (v: string) => {
    setDraft(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };
  const common = {
    "aria-label": label,
    placeholder,
    maxLength,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      flush();
      if (!draft.trim() && !allowEmpty) setDraft(value);
    },
  };

  if (multiline)
    return <GrowingTextarea {...common} value={draft} onChange={(e) => change(e.target.value)} className={className} />;
  return (
    <input
      {...common}
      value={draft}
      onChange={(e) => change(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
          onEnter?.();
        }
      }}
      className={className}
    />
  );
}
