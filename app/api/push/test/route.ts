import { NextResponse } from "next/server";
import { pushConfigured, sendAll } from "@/lib/push";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** «Δοκιμαστική ειδοποίηση»: one reminder to the teacher's own devices, right now. */
export async function POST() {
  if (!pushConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Χρειάζεται σύνδεση." }, { status: 401 });
  const { data, error } = await db.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (error) return NextResponse.json({ error: "Οι ειδοποιήσεις δεν έχουν ενεργοποιηθεί ακόμη στη βάση." }, { status: 503 });
  const r = await sendAll(
    (data ?? []).map((s) => ({ ...s, title: "Παιδονομία σε 5′", body: "Δοκιμή · έτσι θα έρχεται η υπενθύμιση", tag: "test", url: "/" })),
  );
  if (r.gone.length) await db.from("push_subscriptions").delete().in("endpoint", r.gone);
  return NextResponse.json(r);
}
