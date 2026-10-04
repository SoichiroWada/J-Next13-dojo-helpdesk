"use client";

import type { FormEvent } from "react";
import type { TicketStatus } from "@/types/ticket";
import { ticketStatuses } from "@/types/ticket";
import { getErrorMessage } from "@/utils/errors";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTicket } from "@/utils/firebase/tickets";

export default function CreateForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<TicketStatus>("Not started");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await createTicket({ title, body, status });
      router.push("/tickets");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-3/4">
      <label>
        <span>Title:</span>
        <input required type="text" onChange={(e) => setTitle(e.target.value)} value={title} />
      </label>
      <label>
        <span>Body:</span>
        <textarea required className="h-48" onChange={(e) => setBody(e.target.value)} value={body} />
      </label>
      <label>
        <span>Status:</span>
        <select onChange={(e) => setStatus(e.target.value as TicketStatus)} value={status}>
          {ticketStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <button className="btn-primary" disabled={isLoading}>
        {isLoading && <span>Adding...</span>}
        {!isLoading && <span>Add Ticket</span>}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
