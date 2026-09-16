import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  const ticket = await request.json();

  //get supabase instance
  const supabase = await createClient();

  //get the current user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Not authenticated" },
      },
      { status: 401 },
    );
  }

  //insert the data
  const { data, error } = await supabase
    .from("Tickets")
    .insert({
      ...ticket,
      user_email: user.email,
    })
    .select()
    .single();

  return NextResponse.json({ data, error });
}
