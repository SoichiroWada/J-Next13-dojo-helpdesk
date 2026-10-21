"use client";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "./client";
import type { TicketStatus } from "@/types/ticket";
import type { TicketMessage } from "@/types/message";

export function subscribeTicketMessages(
  ticketId: string,
  onUpdate: (messages: TicketMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const { db } = getFirebase();
  const q = query(
    collection(db, "tickets", ticketId, "messages"),
    orderBy("created_at", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ticket_id: ticketId,
          body: data.body ?? "",
          user_id: data.user_id ?? "",
          user_email: data.user_email ?? "",
          created_at: data.created_at,
          updated_at: data.updated_at,
        } as TicketMessage;
      });
      onUpdate(messages);
    },
    (err) => {
      onError(err);
    }
  );
}

export async function createTicketMessage(ticketId: string, body: string, status?: TicketStatus): Promise<string> {
  const { auth, db } = getFirebase();
  const user = auth.currentUser;
  if (!user?.emailVerified) {
    throw new Error("Please verify your email before posting messages.");
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Message body cannot be empty.");
  }

  const messageData = {
    body: trimmed,
    user_id: user.uid,
    user_email: user.email,
    created_at: serverTimestamp(),
  };
  if (status) {
    const messageRef = doc(collection(db, "tickets", ticketId, "messages"));
    const batch = writeBatch(db);
    batch.set(messageRef, messageData);
    batch.update(doc(db, "tickets", ticketId), { status, updated_at: serverTimestamp() });
    await batch.commit();
    return messageRef.id;
  }
  const docRef = await addDoc(collection(db, "tickets", ticketId, "messages"), messageData);

  // チケットの updated_at を更新（エラーが発生してもメッセージ投稿自体は成功扱い）
  try {
    await updateDoc(doc(db, "tickets", ticketId), {
      updated_at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Failed to update ticket updated_at:", e);
  }

  return docRef.id;
}

// The rules enforce author-only edits and preserve the original author/time.
export async function updateTicketMessage(ticketId: string, messageId: string, body: string, status?: TicketStatus): Promise<void> {
  const { auth, db } = getFirebase();
  if (!auth.currentUser?.emailVerified) {
    throw new Error("Please verify your email before editing messages.");
  }
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message body cannot be empty.");
  if (trimmed.length > 10000) throw new Error("Message body must be at most 10000 characters.");
  const messageRef = doc(db, "tickets", ticketId, "messages", messageId);
  const messageData = { body: trimmed, updated_at: serverTimestamp() };
  if (status) {
    const batch = writeBatch(db);
    batch.update(messageRef, messageData);
    batch.update(doc(db, "tickets", ticketId), { status, updated_at: serverTimestamp() });
    await batch.commit();
    return;
  }
  await updateDoc(messageRef, messageData);
  try {
    await updateDoc(doc(db, "tickets", ticketId), { updated_at: serverTimestamp() });
  } catch (error) {
    console.warn("Failed to update ticket updated_at:", error);
  }
}
