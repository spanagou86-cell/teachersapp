"use client";

import { loadBlob } from "./store/blobs";
import { remote } from "./store/remote";
import type { FileMeta } from "./types";

/** The stored file itself: from the account (private link) or from this device (demo). */
export async function fileBlob(file: FileMeta): Promise<Blob | undefined> {
  if (file.path) {
    const url = await remote.signedUrl(file.path);
    if (!url) return undefined;
    const res = await fetch(url).catch(() => undefined);
    return res?.ok ? await res.blob() : undefined;
  }
  if (file.blobKey) return (await loadBlob(file.blobKey)) ?? undefined;
  return undefined;
}

const isPdf = (f: FileMeta) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: FileMeta) => f.type.startsWith("image/");
export const printable = (f?: FileMeta) => !!f && (isPdf(f) || isImage(f));

/** Phones and tablets print from their own PDF viewer (Share → Print); computers from a hidden frame. */
const touch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function printInFrame(src: string, html?: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    const done = () => setTimeout(() => frame.remove(), 60_000);
    frame.onload = () => {
      // Give the PDF viewer a moment to lay out the pages.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } finally {
          done();
          resolve();
        }
      }, 400);
    };
    if (html) frame.srcdoc = html;
    else frame.src = src;
    document.body.appendChild(frame);
  });
}

/**
 * «Εκτύπωση» of an uploaded booklet: opens the printer dialog straight away (number of copies
 * is chosen there). Returns a message for the teacher when something stands in the way.
 */
export async function printFile(file: FileMeta): Promise<{ ok: true; hint?: string } | { ok: false; error: string }> {
  if (!printable(file)) return { ok: false, error: "Αυτό το αρχείο (Word) δεν τυπώνεται από εδώ. Ανέβασέ το ως PDF." };
  const blob = await fileBlob(file);
  if (!blob)
    return {
      ok: false,
      error: file.path ? "Το αρχείο δεν άνοιξε. Έλεγξε τη σύνδεση και δοκίμασε ξανά." : "Δείγμα επίδειξης: δεν υπάρχει πραγματικό αρχείο για εκτύπωση.",
    };
  const url = URL.createObjectURL(new Blob([blob], { type: isPdf(file) ? "application/pdf" : file.type }));
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
  if (touch()) {
    window.open(url, "_blank");
    return { ok: true, hint: "Άνοιξε το αρχείο · πάτα Κοινοποίηση → Εκτύπωση" };
  }
  if (isImage(file))
    await printInFrame(
      "",
      `<!doctype html><html><head><style>@page{size:A4;margin:8mm}html,body{margin:0}img{display:block;max-width:100%;max-height:100vh;margin:0 auto;object-fit:contain}</style></head><body><img src="${url}"></body></html>`,
    );
  else await printInFrame(url);
  return { ok: true };
}
