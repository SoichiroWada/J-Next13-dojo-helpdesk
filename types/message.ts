import type { Timestamp } from "firebase/firestore";

export interface TicketMessage {
  id: string;
  ticket_id: string;
  body: string;
  user_id: string;
  user_email: string;
  created_at: Timestamp;
}

export type TicketMessageFormData = {
  body: string;
};

export interface MessagesLoadState {
  ticketId: string | null;
  messages: TicketMessage[];
  error: string;
}
