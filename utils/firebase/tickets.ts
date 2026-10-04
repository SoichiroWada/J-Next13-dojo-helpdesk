"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebase } from "./client";
import type { Ticket, TicketDocument, TicketFormData } from "@/types/ticket";

// Firestore data is untyped. The assertion describes the existing schema; it
// does not transform records or add new validation behavior.
export async function getTickets(): Promise<Ticket[]> {
  const snapshot = await getDocs(query(collection(getFirebase().db, "tickets"), orderBy("created_at", "desc")));
  return snapshot.docs.map((document) => ({ ...(document.data() as TicketDocument), id: document.id }));
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const snapshot = await getDoc(doc(getFirebase().db, "tickets", id));
  return snapshot.exists() ? { ...(snapshot.data() as TicketDocument), id: snapshot.id } : null;
}

export async function createTicket({ title, body, priority }: TicketFormData) {
  const { auth, db } = getFirebase();
  const user = auth.currentUser;
  if (!user?.emailVerified) throw new Error("Please verify your email before creating tickets.");
  return addDoc(collection(db, "tickets"), {
    title, body, priority, user_id: user.uid, user_email: user.email,
    created_at: serverTimestamp(),
  });
}

export async function deleteTicket(id: string): Promise<void> {
  // Firestore rules require verified authentication, including outside this UI.
  await deleteDoc(doc(getFirebase().db, "tickets", id));
}


// Only editable fields are sent; creator information and creation time are preserved.
export async function updateTicket(id: string, { title, body, priority }: TicketFormData): Promise<void> {
  await updateDoc(doc(getFirebase().db, "tickets", id), { title, body, priority });
}
