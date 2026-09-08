import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  const id = params.id;
  const res = await fetch(`http://192.168.1.68:4000/tickets/${id}`);
  const tickets = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: "Cannot find the ticket" },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json(tickets, {
    status: 200,
  });
}
