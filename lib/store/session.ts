"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from ".";
import { cloudEnabled, supabase } from "../supabase/client";
import { useHydrated } from "./hooks";

export const PUBLIC_PATHS = ["/login", "/auth"];
const BARE_PATHS = ["/login", "/onboarding", "/auth"];

export const isBarePath = (p: string) => BARE_PATHS.some((b) => p === b || p.startsWith(`${b}/`));

/**
 * Decides who is using the app: a signed-in teacher (data from Supabase), the demo
 * (sample data in this browser) or nobody (→ /login). Returns true when screens can render.
 */
export function useSession(): boolean {
  const hydrated = useHydrated();
  const mode = useApp((s) => s.mode);
  const userId = useApp((s) => s.userId);
  const onboarded = useApp((s) => s.profile.onboarded);
  const loadCloud = useApp((s) => s.loadCloud);
  const leave = useApp((s) => s.leave);
  const tick = useApp((s) => s.tick);
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  // Resolve the session once the demo state has been restored from storage.
  useEffect(() => {
    if (!hydrated) return;
    if (mode === "demo" || !cloudEnabled) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    // getSession reads the stored session without a network round trip; the database
    // still checks the token on every request (row level security).
    supabase()
      .auth.getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const user = data.session?.user;
        if (user) {
          if (useApp.getState().userId !== user.id) await loadCloud(user.id, user.email ?? undefined);
        } else if (useApp.getState().mode === "cloud") {
          leave();
        }
      })
      .catch(() => setError(true))
      .finally(() => !cancelled && setChecked(true));
    const { data: sub } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") leave();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [hydrated, mode, loadCloud, leave]);

  // Routing: nobody → login, new teacher → onboarding.
  useEffect(() => {
    if (!checked) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!mode && !isPublic) router.replace("/login");
    else if (mode === "cloud" && !onboarded && !pathname.startsWith("/onboarding") && !pathname.startsWith("/settings/timetable")) router.replace("/onboarding");
  }, [checked, mode, onboarded, pathname, router]);

  // Real clock for signed-in teachers.
  useEffect(() => {
    if (mode !== "cloud") return;
    const h = setInterval(tick, 30_000);
    return () => clearInterval(h);
  }, [mode, tick]);

  if (error) return true;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  return checked && (isPublic || mode === "demo" || (mode === "cloud" && !!userId));
}
