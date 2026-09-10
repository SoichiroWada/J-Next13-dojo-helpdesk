import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// export const dynamic = "force-dynamic";

// export async function GET() {
//   const res = await fetch("http://192.168.1.68:4000/tickets");

//   const tickets = await res.json();

//   return NextResponse.json(tickets, {
//     status: 200,
//   });
// }

export async function POST(request) {
  const ticket = await request.json();

  //get supabase instance
  const supabase = createRouteHandlerClient();

  //get the current user session
  const { data: { session } } = await supabase.auth.getSession();

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
