"use client";

import clsx from "clsx";
import { CheckCircle2 } from "@/components/icons";
import { useEffect, useState } from "react";
import { create } from "zustand";

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

const useToasts = create<{ items: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  // One message at a time: the newest replaces the one on screen.
  push: (t) => set(() => ({ items: [{ ...t, id: Date.now() + Math.random() }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = (text: string, action?: Toast["action"]) => useToasts.getState().push({ text, action });

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);
  // Short and quiet: gone in under 3″, a little longer when it offers «Αναίρεση».
  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), t.action ? 4800 : 2400);
    const gone = setTimeout(() => dismiss(t.id), t.action ? 5000 : 2600);
    return () => (clearTimeout(out), clearTimeout(gone));
  }, [t, dismiss]);
  return (
    <div
      role="status"
      onClick={() => !t.action && dismiss(t.id)}
      className={clsx(
        "pointer-events-auto flex max-w-[min(26rem,100%)] animate-slide-up items-center gap-2.5 rounded-full bg-ink/95 py-2 pl-3.5 text-[13.5px] font-medium text-bg shadow-pop backdrop-blur transition-[opacity,transform] duration-200",
        t.action ? "pr-1.5" : "pr-4",
        leaving && "translate-y-1 opacity-0",
      )}
    >
      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
      <span className="min-w-0 truncate">{t.text}</span>
      {t.action && (
        <button
          type="button"
          className="shrink-0 rounded-full bg-bg/10 px-3 py-1 text-[13px] font-semibold text-bg hover:bg-bg/20"
          onClick={() => {
            t.action!.run();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
