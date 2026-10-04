"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase is not configured");
  client ??= createBrowserClient(url, key);
  return client;
}
