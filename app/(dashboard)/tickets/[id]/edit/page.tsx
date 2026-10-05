"use client";

import type { TicketLoadState, TicketRouteParams } from "@/types/ticket";
import { getErrorMessage } from "@/utils/errors";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTicket } from "@/utils/firebase/tickets";
import Loading from "../../../loading";
import NotFound from "../not-found";
import EditForm from "./EditForm";

export default function EditTicket() {
  const { id } = useParams<TicketRouteParams>();
  const [result, setResult] = useState<TicketLoadState>({ id: null, ticket: null, error: "" });

  useEffect(() => {
    let active = true;
    getTicket(id).then((ticket) => {
      if (active) setResult({ id, ticket, error: "" });
    }).catch((error) => {
      if (active) setResult({ id, ticket: null, error: getErrorMessage(error) });
    });
    return () => { active = false; };
  }, [id]);

  if (result.id !== id) return <Loading />;
  if (result.error) return <main><div className="error">{result.error}</div></main>;
  if (!result.ticket) return <NotFound />;

  return (
    <main>
      <h2 className="text-primary text-center">Edit Ticket</h2>
      <EditForm key={id} ticket={result.ticket} />
    </main>
  );
}
