import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Supabase callback error:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=auth_callback", url.origin),
    );
  }

  console.log("Authenticated user:", data.user?.id);
  return NextResponse.redirect(url.origin);
}
