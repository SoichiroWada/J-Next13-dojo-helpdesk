"use client";

import type { Ticket } from "@/types/ticket";
import { getErrorMessage } from "@/utils/errors";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getTickets } from "@/utils/firebase/tickets";
import Loading from "../loading";
import { formatTokyoDateTime } from "@/utils/date";
import StatusBadge from "@/app/components/StatusBadge";

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTickets().then((tickets) => {
      if (active) setTickets(tickets);
    }).catch((error) => {
      if (active) setError(getErrorMessage(error));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      {tickets.map((ticket) => (
        <div key={ticket.id} className="card my-5">
          <Link href={`/tickets/${ticket.id}`}>
            <h3 className="pr-56">{ticket.title}</h3>
            <small>Created at: {formatTokyoDateTime(ticket.created_at)}</small>
            <p>{ticket.body.slice(0, 250)}...</p>
            <StatusBadge status={ticket.status} />
          </Link>
        </div>
      ))}
      {tickets.length === 0 && (
        <p className="text-center">There are no open tickets, yay!</p>
      )}
    </>
  );
}
