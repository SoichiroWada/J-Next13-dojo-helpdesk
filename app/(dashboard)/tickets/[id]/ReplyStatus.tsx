import { ticketStatuses, type TicketStatus } from "@/types/ticket";

export default function ReplyStatus({ value, onChange, disabled }: {
  value: TicketStatus | "";
  onChange: (status: TicketStatus | "") => void;
  disabled: boolean;
}) {
  return (
    <label className="whitespace-normal text-sm">
      <span>Ticket status:</span>
      <select value={value} onChange={(event) => onChange(event.target.value as TicketStatus | "")} disabled={disabled}>
        <option value="">Keep current status</option>
        {ticketStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    </label>
  );
}
