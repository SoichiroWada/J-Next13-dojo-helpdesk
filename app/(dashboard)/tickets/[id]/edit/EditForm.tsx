"use client";

import type { FormEvent } from "react";
import type { Ticket, TicketPriority } from "@/types/ticket";
import { getErrorMessage } from "@/utils/errors";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateTicket } from "@/utils/firebase/tickets";

export default function EditForm({ ticket }: { ticket: Ticket }) {
  const router = useRouter();

  const [title, setTitle] = useState(ticket.title);
  const [body, setBody] = useState(ticket.body);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await updateTicket(ticket.id, { title, body, priority });
      router.push(`/tickets/${ticket.id}`);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-1/2">
      <label>
        <span>Title:</span>
        <input required type="text" onChange={(e) => setTitle(e.target.value)} value={title} />
      </label>
      <label>
        <span>Body:</span>
        <textarea required className="h-48" onChange={(e) => setBody(e.target.value)} value={body} />
      </label>
      <label>
        <span>Priority:</span>
        <select onChange={(e) => setPriority(e.target.value as TicketPriority)} value={priority}>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
      </label>
      <button className="btn-primary" disabled={isLoading}>
        {isLoading && <span>Updating...</span>}
        {!isLoading && <span>Update</span>}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
