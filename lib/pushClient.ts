"use client";

import { supabase } from "./supabase/client";

/**
 * Push reminders on this device. iPhone only allows them for the app added to the home
 * screen (iOS 16.4+); other phones and computers allow them in the browser too.
 */
export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !standalone()) return "ios-install";
  if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Asks once for permission, subscribes this device and saves it to the account. */
export async function enablePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Δεν δόθηκε άδεια για ειδοποιήσεις. Μπορείς να την αλλάξεις από τις ρυθμίσεις του κινητού." };
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { ok: false, error: "Η συσκευή δεν έδωσε στοιχεία ειδοποιήσεων. Δοκίμασε ξανά." };
    const { error } = await supabase()
      .from("push_subscriptions")
      .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, duty: true }, { onConflict: "owner,endpoint" });
    if (error) return { ok: false, error: "Οι ειδοποιήσεις δεν είναι ακόμη ενεργές στον λογαριασμό. Δοκίμασε σε λίγο." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Οι ειδοποιήσεις δεν ενεργοποιήθηκαν σε αυτή τη συσκευή. Δοκίμασε ξανά." };
  }
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function testPush(): Promise<string> {
  const res = await fetch("/api/push/test", { method: "POST" }).catch(() => undefined);
  const json = (await res?.json().catch(() => ({}))) as { sent?: number; error?: string };
  if (!res?.ok) return json.error === "not-configured" ? "Οι ειδοποιήσεις δεν έχουν ρυθμιστεί ακόμη στον server." : json.error || "Δεν στάλθηκε. Δοκίμασε ξανά.";
  return json.sent ? "Στάλθηκε · θα τη δεις σε λίγα δευτερόλεπτα" : "Δεν βρέθηκε συσκευή με ενεργές ειδοποιήσεις.";
}
