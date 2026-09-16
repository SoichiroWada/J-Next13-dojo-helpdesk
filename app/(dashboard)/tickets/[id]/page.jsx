import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

//components
import DeleteButton from "./DeleteButton";

export const dynamicParams = true; // default val = true

export async function generateMetadata({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("Tickets")
    .select()
    .eq("id", id)
    .single();

  return {
    title: `Dojo Helpdesk | ${ticket?.title || "Ticket not found"}`,
  };
}

async function getTicket(id) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("Tickets")
    .select()
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }
  return data;
}

export default async function TicketDetails({ params }) {
  const { id } = await params;
  const ticket = await getTicket(id);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <nav>
        <h2>Ticket Details</h2>
      </nav>
      <div className="card">
        <h3>{ticket.title}</h3>
        <small>Created by {ticket.user_email}</small>
        <p>{ticket.body}</p>
        <div className={`pill ${ticket.priority}`}>
          {ticket.priority} priority
        </div>
      </div>
      {user?.email === ticket.user_email && (
        <DeleteButton id={ticket.id}></DeleteButton>
      )}
    </main>
  );
}
