"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "./client";

export async function getTickets() {
  const snapshot = await getDocs(query(collection(getFirebase().db, "tickets"), orderBy("created_at", "desc")));
  return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
}

export async function getTicket(id) {
  const snapshot = await getDoc(doc(getFirebase().db, "tickets", id));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}

export async function createTicket({ title, body, priority }) {
  const { auth, db } = getFirebase();
  const user = auth.currentUser;
  if (!user?.emailVerified) throw new Error("Please verify your email before creating tickets.");
  return addDoc(collection(db, "tickets"), {
    title, body, priority, user_id: user.uid, user_email: user.email,
    created_at: serverTimestamp(),
  });
}

export async function deleteTicket(id) {
  // Firestore rules enforce ownership, including requests made outside this UI.
  await deleteDoc(doc(getFirebase().db, "tickets", id));
}
