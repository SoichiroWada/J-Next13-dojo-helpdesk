import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(_, { params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: { message: "Not authenticated" },
      },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("Tickets")
    .delete()
    .eq("id", id)
    .eq("user_email", user.email);

  return NextResponse.json({ error });
}
