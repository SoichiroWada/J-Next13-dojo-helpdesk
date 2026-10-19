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
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "./client";
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
        } as TicketMessage;
      });
      onUpdate(messages);
    },
    (err) => {
      onError(err);
    }
  );
}

export async function createTicketMessage(ticketId: string, body: string): Promise<string> {
  const { auth, db } = getFirebase();
  const user = auth.currentUser;
  if (!user?.emailVerified) {
    throw new Error("Please verify your email before posting messages.");
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Message body cannot be empty.");
  }

  const docRef = await addDoc(collection(db, "tickets", ticketId, "messages"), {
    body: trimmed,
    user_id: user.uid,
    user_email: user.email,
    created_at: serverTimestamp(),
  });

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
