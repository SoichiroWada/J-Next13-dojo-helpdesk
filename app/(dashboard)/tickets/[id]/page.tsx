"use client";

import type { TicketLoadState, TicketRouteParams } from "@/types/ticket";
import { getErrorMessage } from "@/utils/errors";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTicket } from "@/utils/firebase/tickets";
import DeleteButton from "./DeleteButton";
import NotFound from "./not-found";
import Loading from "../../loading";
import { formatTokyoDateTime } from "@/utils/date";
import StatusBadge from "@/app/components/StatusBadge";

export default function TicketDetails() {
  const { id } = useParams<TicketRouteParams>();
  const [result, setResult] = useState<TicketLoadState>({ id: null, ticket: null, error: "" });

  useEffect(() => {
    let active = true;
    getTicket(id)
      .then((ticket) => {
        if (active) {
          setResult({ id, ticket, error: "" });
          document.title = "Dojo Helpdesk | " + (ticket?.title || "Ticket not found");
        }
      })
      .catch((error) => {
        if (active) setResult({ id, ticket: null, error: getErrorMessage(error) });
      });
    return () => {
      active = false;
      document.title = "Dojo Helpdesk";
    };
  }, [id]);

  if (result.id !== id) return <Loading />;
  if (result.error)
    return (
      <main>
        <div className="error">{result.error}</div>
      </main>
    );
  const ticket = result.ticket;
  if (!ticket) return <NotFound />;

  return (
    <main>
      <nav>
        <h2>Ticket Details</h2>
      </nav>
      <div className="card">
        <h3 className="pr-56">{ticket.title}</h3>
        <small className="block">Created at: {formatTokyoDateTime(ticket.created_at)}</small>
        {ticket.updated_at && (
          <small className="block">Updated at: {formatTokyoDateTime(ticket.updated_at)}</small>
        )}
        <small className="block">Created by: {ticket.user_email}</small>
        <StatusBadge status={ticket.status} />
        <p>{ticket.body}</p>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <Link href={`/tickets/${ticket.id}/edit`}>
          <button className="btn-primary">Edit Ticket</button>
        </Link>
        <DeleteButton id={ticket.id} />
      </div>
    </main>
  );
}
