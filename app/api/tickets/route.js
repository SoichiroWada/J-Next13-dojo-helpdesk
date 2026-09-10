import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  const ticket = await request.json();

  //get supabase instance
  const supabase = createRouteHandlerClient({ cookies });

  //get the current user session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { data: null, error: { message: "Not authenticated" } },
      { status: 401 },
    );
  }

  //insert the data
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      ...ticket,
      user_email: session.user.email,
    })
    .select()
    .single();

  return NextResponse.json({ data, error });
}
