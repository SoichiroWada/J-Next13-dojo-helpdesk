"use client";

import ReplyStatus from "./ReplyStatus";
import type { TicketStatus } from "@/types/ticket";
import { useState, type FormEvent } from "react";
import type { TicketMessage } from "@/types/message";
import { updateTicketMessage } from "@/utils/firebase/messages";
import { getErrorMessage } from "@/utils/errors";
import { formatTokyoDateTime } from "@/utils/date";

export default function MessageBody({ ticketId, message, canEdit, onStatusChange }: {
  ticketId: string; message: TicketMessage; canEdit: boolean; onStatusChange: (status: TicketStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(message.body);
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateTicketMessage(ticketId, message.id, body, status || undefined);
      if (status) onStatusChange(status);
      setEditing(false);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return editing && canEdit ? (
    <form onSubmit={save} className="!w-full !min-w-0 !max-w-full !p-0 !bg-transparent !m-0 whitespace-normal">
      <label>
        <span>Edit reply:</span>
        <textarea required maxLength={10000} rows={4} value={body}
          onChange={(event) => setBody(event.target.value)} disabled={saving} />
      </label>
      <ReplyStatus value={status} onChange={setStatus} disabled={saving} />
      {error && <div className="error" role="alert">{error}</div>}
      <div className="flex gap-3 mt-2">
        <button type="submit" className="btn-primary" disabled={saving || !body.trim()}>
          {saving ? "Saving..." : "Save Reply"}
        </button>
        <button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  ) : (
    <>
      <div>{message.body}</div>
      {message.updated_at && <small className="block mt-2 text-gray-500">Edited: {formatTokyoDateTime(message.updated_at)}</small>}
      {canEdit && <button type="button" className="block mt-2 text-primary text-xs" onClick={() => {
        setBody(message.body);
        setStatus("");
        setError("");
        setEditing(true);
      }}>Edit Reply</button>}
    </>
  );
}
