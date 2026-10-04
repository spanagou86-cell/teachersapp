"use client";

import { useEffect, useState } from "react";

/**
 * The part of the screen the teacher can actually see. On phones the on-screen keyboard
 * covers the bottom of the page without resizing it (iOS), so sheets size themselves to this.
 */
export function useVisibleViewport(active: boolean): { top: number; height: number } | null {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? box : null;
}

/** Keeps the page behind a sheet still, including on iOS where overflow:hidden is ignored. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const y = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      Object.assign(body.style, prev);
      window.scrollTo(0, y);
    };
  }, [active]);
}

const isTextField = (el: Element | null) =>
  !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|file)$/i.test((el as HTMLInputElement).type)) || (el as HTMLElement).isContentEditable);

/**
 * Marks <html data-kb> while the on-screen keyboard is likely open, so fixed bars
 * (the bottom navigation) step aside instead of floating over the field being typed in.
 */
export function useKeyboardFlag() {
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch) return;
    const root = document.documentElement;
    const set = (on: boolean) => {
      if (on) root.dataset.kb = "";
      else delete root.dataset.kb;
    };
    const onIn = (e: FocusEvent) => set(isTextField(e.target as Element));
    // Focus may move straight to another field; check after it settles.
    const onOut = () => setTimeout(() => set(isTextField(document.activeElement)), 50);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      set(false);
    };
  }, []);
}

/** Brings a focused field into view inside its scroll area once the keyboard has opened. */
export function revealOnFocus(e: React.FocusEvent<HTMLElement>) {
  const el = e.target as HTMLElement;
  if (!isTextField(el)) return;
  setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
}
