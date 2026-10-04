import type { Timestamp } from "firebase/firestore";

export type TicketPriority = "low" | "medium" | "high";

export interface Ticket {
  id: string;
  title: string;
  body: string;
  priority: TicketPriority;
  user_email: string;
  user_id: string;
  created_at: Timestamp;
}

// These are the only fields accepted by the create and edit forms.
export type TicketFormData = Pick<Ticket, "title" | "body" | "priority">;

// Firestore stores the document ID separately from its fields.
export type TicketDocument = Omit<Ticket, "id">;

export type TicketRouteParams = {
  id: string;
};

export interface TicketLoadState {
  id: string | null;
  ticket: Ticket | null;
  error: string;
}
