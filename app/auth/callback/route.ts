import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Landing point of the e-mail sign-in link. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const client = await supabaseServer();
  const { error } = code
    ? await client.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" | "signup" })
      : { error: new Error("missing code") };
  return NextResponse.redirect(`${origin}${error ? "/login?error=link" : "/"}`);
}
