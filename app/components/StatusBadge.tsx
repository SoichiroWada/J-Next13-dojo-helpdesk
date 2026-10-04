import type { TicketStatus } from "@/types/ticket";

const statusColors: Record<TicketStatus, string> = {
  "Not started": "bg-orange-300 text-orange-800",
  "In progress": "bg-blue-300 text-blue-800",
  "Pending": "bg-yellow-300 text-yellow-800",
  "Resolved": "bg-green-400 text-green-900",
  "Closed": "bg-gray-200 text-gray-700",
  "Won't Fix": "bg-purple-300 text-purple-800",
  "Pending Release": "bg-green-200 text-green-800",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return <div className={`pill ${statusColors[status]}`}>Status: {status}</div>;
}
