import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketDocument, TicketFormData } from "@/types/ticket";
import { ticketStatuses } from "@/types/ticket";

// Both boundaries are replaced before importing the service: these tests cannot
// initialize a Firebase app or send reads/writes to any Firestore instance.
const mocks = vi.hoisted(() => ({
  getFirebase: vi.fn(),
  addDoc: vi.fn(), collection: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(),
  getDoc: vi.fn(), getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn(),
  serverTimestamp: vi.fn(), updateDoc: vi.fn(),
}));
vi.mock("firebase/firestore", () => mocks);
vi.mock("@/utils/firebase/client", () => ({ getFirebase: mocks.getFirebase }));

import { createTicket, deleteTicket, getTicket, getTickets, updateTicket } from "@/utils/firebase/tickets";

const db = { name: "fake-db" };
const collectionRef = { path: "tickets" };
const documentRef = { path: "tickets/ticket-1" };
const timestampSentinel = { kind: "server-timestamp" };
const createdAt = { seconds: 100, nanoseconds: 0 };
const original = {
  title: "Printer broken", body: "Paper jam", priority: "low",
  user_id: "author-1", user_email: "author@example.test", created_at: createdAt,
} as TicketDocument;
const form: TicketFormData = { title: "New title", body: "New body", status: "Pending" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getFirebase.mockReturnValue({
    db, auth: { currentUser: { uid: "author-1", email: "author@example.test", emailVerified: true } },
  });
  mocks.collection.mockReturnValue(collectionRef);
  mocks.doc.mockReturnValue(documentRef);
  mocks.serverTimestamp.mockReturnValue(timestampSentinel);
});

function expectNoWrites() {
  expect(mocks.addDoc).not.toHaveBeenCalled();
  expect(mocks.updateDoc).not.toHaveBeenCalled();
  expect(mocks.deleteDoc).not.toHaveBeenCalled();
}

describe("Ticket reads and status normalization", () => {
  it.each(ticketStatuses)("preserves the stored status %s and other ticket fields", async (status) => {
    const data = Object.freeze({ ...original, status, id: "untrusted-field-id" });
    mocks.getDoc.mockResolvedValue({ id: "ticket-1", exists: () => true, data: () => data });
    expect(await getTicket("ticket-1")).toEqual({ ...original, id: "ticket-1", status });
    expect(mocks.doc).toHaveBeenCalledWith(db, "tickets", "ticket-1");
    expect(data.id).toBe("untrusted-field-id");
    expectNoWrites();
  });

  it.each([undefined, null])("defaults a legacy %s status without mutating or writing it", async (status) => {
    const data = Object.freeze({ ...original, status });
    mocks.getDoc.mockResolvedValue({ id: "legacy", exists: () => true, data: () => data });
    expect(await getTicket("legacy")).toEqual({ ...original, id: "legacy", status: "Not started" });
    expect(data.status).toBe(status);
    expectNoWrites();
  });

  it("returns null for a missing ticket without accessing document data", async () => {
    const data = vi.fn();
    mocks.getDoc.mockResolvedValue({ exists: () => false, data });
    expect(await getTicket("missing")).toBeNull();
    expect(data).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("requests newest-first ordering and normalizes each list entry without reordering", async () => {
    const order = { field: "created_at" };
    const query = { name: "ordered-tickets" };
    mocks.orderBy.mockReturnValue(order);
    mocks.query.mockReturnValue(query);
    mocks.getDocs.mockResolvedValue({ docs: [
      { id: "new", data: () => ({ ...original, status: "Closed" }) },
      { id: "legacy", data: () => original },
    ] });
    expect(await getTickets()).toEqual([
      { ...original, id: "new", status: "Closed" },
      { ...original, id: "legacy", status: "Not started" },
    ]);
    expect(mocks.collection).toHaveBeenCalledWith(db, "tickets");
    expect(mocks.orderBy).toHaveBeenCalledWith("created_at", "desc");
    expect(mocks.query).toHaveBeenCalledWith(collectionRef, order);
    expect(mocks.getDocs).toHaveBeenCalledWith(query);
    expectNoWrites();
  });

  it("returns an empty list for an empty collection", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    expect(await getTickets()).toEqual([]);
    expectNoWrites();
  });

  it.each([getTickets, () => getTicket("ticket-1")])("propagates read failures", async (read) => {
    const error = new Error("permission-denied");
    mocks.getDoc.mockRejectedValue(error);
    mocks.getDocs.mockRejectedValue(error);
    await expect(read()).rejects.toBe(error);
    expectNoWrites();
  });
});

describe("Ticket creation and validation boundaries", () => {
  it.each(ticketStatuses)("creates with status %s, authenticated ownership and server time", async (status) => {
    const result = { id: "created-id" };
    mocks.addDoc.mockResolvedValue(result);
    expect(await createTicket({ ...form, status })).toBe(result);
    expect(mocks.addDoc).toHaveBeenCalledExactlyOnceWith(collectionRef, {
      ...form, status, priority: "low", user_id: "author-1",
      user_email: "author@example.test", created_at: timestampSentinel,
    });
  });

  it.each([null, { emailVerified: false }, { uid: "author-1" }])(
    "rejects missing/unverified users before preparing a write: %j", async (currentUser) => {
      mocks.getFirebase.mockReturnValue({ db, auth: { currentUser } });
      await expect(createTicket(form)).rejects.toThrow("Please verify your email before creating tickets.");
      expect(mocks.collection).not.toHaveBeenCalled();
      expect(mocks.serverTimestamp).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("ignores supplied ownership, priority, timestamps and extra fields", async () => {
    const input = Object.freeze({
      ...form, id: "forged", user_id: "forged", user_email: "forged@example.test",
      priority: "high", created_at: "forged", updated_at: "forged", extra: true,
    });
    await createTicket(input);
    expect(mocks.addDoc).toHaveBeenCalledExactlyOnceWith(collectionRef, {
      ...form, priority: "low", user_id: "author-1", user_email: "author@example.test",
      created_at: timestampSentinel,
    });
  });

  it("propagates Firestore validation errors for an invalid payload", async () => {
    // Runtime validation of these fields lives in Firestore rules, not this wrapper.
    const invalid = { title: "", body: "", status: "invalid" } as unknown as TicketFormData;
    const error = new Error("permission-denied");
    mocks.addDoc.mockRejectedValue(error);
    await expect(createTicket(invalid)).rejects.toBe(error);
    expect(mocks.addDoc).toHaveBeenCalledWith(collectionRef, expect.objectContaining(invalid));
  });
});

describe("Ticket updates and deletion", () => {
  it.each(ticketStatuses)("updates editable fields to status %s with server time", async (status) => {
    await updateTicket("ticket-1", { ...form, status });
    expect(mocks.doc).toHaveBeenCalledWith(db, "tickets", "ticket-1");
    expect(mocks.updateDoc).toHaveBeenCalledExactlyOnceWith(documentRef, {
      ...form, status, updated_at: timestampSentinel,
    });
    expect(mocks.addDoc).not.toHaveBeenCalled();
  });

  it("excludes immutable fields and extra properties from updates", async () => {
    const input = Object.freeze({
      ...form, id: "forged", priority: "high", user_id: "forged",
      user_email: "forged@example.test", created_at: "forged", updated_at: "forged", extra: true,
    });
    await updateTicket("ticket-1", input);
    expect(mocks.updateDoc).toHaveBeenCalledExactlyOnceWith(documentRef, {
      ...form, updated_at: timestampSentinel,
    });
  });

  it("preserves whitespace and Unicode rather than silently changing user text", async () => {
    const input = { title: "  印刷エラー  ", body: "\nDetails 🖨️\n", status: "In progress" } satisfies TicketFormData;
    await createTicket(input);
    await updateTicket("ticket-1", input);
    expect(mocks.addDoc).toHaveBeenCalledWith(collectionRef, expect.objectContaining(input));
    expect(mocks.updateDoc).toHaveBeenCalledWith(documentRef, { ...input, updated_at: timestampSentinel });
  });

  it("propagates update validation failures", async () => {
    const error = new Error("permission-denied");
    mocks.updateDoc.mockRejectedValue(error);
    await expect(updateTicket("ticket-1", form)).rejects.toBe(error);
  });

  it("deletes only the requested document", async () => {
    await deleteTicket("ticket-1");
    expect(mocks.doc).toHaveBeenCalledWith(db, "tickets", "ticket-1");
    expect(mocks.deleteDoc).toHaveBeenCalledExactlyOnceWith(documentRef);
    expect(mocks.addDoc).not.toHaveBeenCalled();
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it("propagates delete authorization failures", async () => {
    const error = new Error("permission-denied");
    mocks.deleteDoc.mockRejectedValue(error);
    await expect(deleteTicket("ticket-1")).rejects.toBe(error);
  });
});
