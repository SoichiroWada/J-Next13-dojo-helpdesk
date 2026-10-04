import type { Timestamp } from "firebase/firestore";

export type TicketPriority = "low" | "medium" | "high";

export type TicketStatus =
  | "Not started"
  | "In progress"
  | "Pending"
  | "Resolved"
  | "Closed"
  | "Won't Fix"
  | "Pending Release";

export const ticketStatuses: TicketStatus[] = [
  "Not started", "In progress", "Pending", "Resolved", "Closed",
  "Won't Fix", "Pending Release",
];

export interface Ticket {
  id: string;
  title: string;
  body: string;
  priority: TicketPriority;
  status: TicketStatus;
  user_email: string;
  user_id: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

// These are the only fields accepted by the create and edit forms.
export type TicketFormData = Pick<Ticket, "title" | "body" | "status">;

// Firestore stores the document ID separately from its fields.
export type TicketDocument = Omit<Ticket, "id" | "status"> & {
  status?: TicketStatus;
};

export type TicketRouteParams = {
  id: string;
};

export interface TicketLoadState {
  id: string | null;
  ticket: Ticket | null;
  error: string;
}
