"use client";

import { CheckCircle2, X } from "@/components/icons";
import { useEffect } from "react";
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
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), t.action ? 7000 : 3500);
    return () => clearTimeout(h);
  }, [t, dismiss]);
  return (
    <div role="status" className="pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-bg shadow-pop">
      <CheckCircle2 className="size-5 shrink-0 text-brand-500" />
      <span className="min-w-0 flex-1 break-words">{t.text}</span>
      {t.action && (
        <button
          type="button"
          className="rounded-lg px-2 py-1 font-semibold text-brand-500 hover:bg-bg/10"
          onClick={() => {
            t.action!.run();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button type="button" aria-label="Κλείσιμο" className="text-bg/60 hover:text-bg" onClick={() => dismiss(t.id)}>
        <X className="size-4" />
      </button>
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
