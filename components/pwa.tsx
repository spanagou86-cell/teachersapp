"use client";

import { Download, Share } from "@/components/icons";
import { useEffect, useState } from "react";
import { toast } from "./toast";
import { Button } from "./ui";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** Registers the service worker (production only, so development never serves cached files). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

const standalone = () =>
  typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Εγκατάσταση στο κινητό" for the settings page: one tap on Android/computer, instructions on iPhone. */
export function InstallRow() {
  const [, rerender] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  if (!mounted || standalone()) return null;
  const ios = isIOS();
  if (!deferred && !ios) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
      <div className="min-w-[12rem] flex-1">
        <p className="font-semibold">Εγκατάσταση στο κινητό</p>
        <p className="text-[13px] text-muted">
          {ios ? (
            <>
              Στο Safari πάτα <Share className="inline size-3.5 align-[-2px]" /> «Κοινοποίηση» και μετά «Προσθήκη στην οθόνη Αφετηρίας».
            </>
          ) : (
            "Η «τάξη» στην αρχική σου οθόνη, να ανοίγει σαν εφαρμογή."
          )}
        </p>
      </div>
      {!ios && deferred && (
        <Button
          variant="secondary"
          onClick={async () => {
            const ev = deferred;
            if (!ev) return;
            await ev.prompt();
            const { outcome } = await ev.userChoice;
            deferred = null;
            rerender((n) => n + 1);
            if (outcome === "accepted") toast("Η «τάξη» προστέθηκε στην αρχική οθόνη");
          }}
        >
          <Download className="size-4" /> Εγκατάσταση
        </Button>
      )}
    </div>
  );
}
