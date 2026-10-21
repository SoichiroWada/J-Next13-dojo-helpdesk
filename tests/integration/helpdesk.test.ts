import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp,
  setDoc, Timestamp, updateDoc,
} from 'firebase/firestore';
import { account, cleanupClients, client, resetEmulators, verifyEmail } from './emulator';
import { ticketStatuses } from '@/types/ticket';

// Replace only the browser configuration boundary. All services, SDK calls,
// Auth tokens, listeners, and Security Rules are real emulator operations.
const boundary = vi.hoisted(() => ({ getFirebase: vi.fn() }));
vi.mock('@/utils/firebase/client', () => boundary);
import { createTicket, deleteTicket, getTicket, getTickets, updateTicket } from '@/utils/firebase/tickets';
import { createTicketMessage, subscribeTicketMessages, updateTicketMessage } from '@/utils/firebase/messages';

const form = { title: 'Printer', body: 'Paper jam', status: 'Not started' as const };
const denied = { code: 'permission-denied' };
const subscriptions: (() => void)[] = [];
beforeEach(async () => {
  boundary.getFirebase.mockReset();
  await resetEmulators();
});
afterEach(async () => {
  subscriptions.splice(0).forEach(stop => stop());
  await cleanupClients();
});
function selectClient(services: ReturnType<typeof client>) { boundary.getFirebase.mockReturnValue(services); }
function payload(services: ReturnType<typeof client>) {
  return { ...form, priority: 'low', user_id: services.auth.currentUser!.uid,
    user_email: services.auth.currentUser!.email, created_at: serverTimestamp() };
}
async function seed() {
  const owner = await account();
  selectClient(owner);
  const ref = await createTicket(form);
  return { owner, ref };
}

describe('Authentication and verified-email access', () => {
  it('signs up, verifies email, refreshes claims, signs out and signs in', async () => {
    const services = await account(false);
    selectClient(services);
    const email = services.auth.currentUser!.email!;
    expect(services.auth.currentUser!.emailVerified).toBe(false);
    await expect(createTicket(form)).rejects.toThrow('verify your email');
    await expect(createTicketMessage('blocked', 'hello')).rejects.toThrow('verify your email');
    await expect(setDoc(doc(services.db, 'tickets/blocked'), payload(services))).rejects.toMatchObject(denied);
    await verifyEmail(services.auth);
    expect(services.auth.currentUser!.emailVerified).toBe(true);
    const ref = await createTicket(form);
    await signOut(services.auth);
    await expect(getTicket(ref.id)).rejects.toMatchObject(denied);
    await expect(signInWithEmailAndPassword(services.auth, email, 'wrong-password')).rejects.toBeDefined();
    await signInWithEmailAndPassword(services.auth, email, 'emulator-password');
    expect((await getTicket(ref.id))?.title).toBe(form.title);
  });

  it.each(['guest', 'unverified'])('rejects all ticket/message operations for %s clients', async kind => {
    const { ref } = await seed();
    const services = kind === 'guest' ? client() : await account(false);
    selectClient(services);
    const ticket = doc(services.db, 'tickets', ref.id);
    const message = doc(services.db, 'tickets', ref.id, 'messages', 'blocked');
    const writes = { ...form, priority: 'low', user_id: 'forged', user_email: 'forged@example.test', created_at: serverTimestamp() };
    for (const operation of [
      () => getTicket(ref.id), () => getTickets(),
      () => setDoc(doc(services.db, 'tickets/blocked'), writes),
      () => updateTicket(ref.id, form), () => deleteTicket(ref.id),
      () => getDocs(collection(ticket, 'messages')),
      () => setDoc(message, { body: 'hello', user_id: 'forged', user_email: 'forged@example.test', created_at: serverTimestamp() }),
      () => updateDoc(message, { body: 'changed' }), () => deleteDoc(message),
    ]) await expect(operation()).rejects.toMatchObject(denied);
    await new Promise<void>((resolve, reject) => {
      subscriptions.push(subscribeTicketMessages(ref.id, () => reject(new Error('Unauthorized listener delivered data')), error => {
        try { expect(error).toMatchObject(denied); resolve(); } catch (e) { reject(e); }
      }));
    });
  });
});

describe('Ticket services and collaborative permissions', () => {
  it('persists edits, preserves tickets, server timestamps and immutable ownership across verified collaborators', async () => {
    const { owner, ref } = await seed();
    const original = (await getTicket(ref.id))!;
    expect(original).toMatchObject({ ...form, priority: 'low', user_id: owner.auth.currentUser!.uid });
    expect(original.created_at).toBeInstanceOf(Timestamp);
    expect(original.updated_at).toBeUndefined();
    const collaborator = await account();
    selectClient(collaborator);
    expect((await getTickets()).map(t => t.id)).toEqual([ref.id]);
    await updateTicket(ref.id, { ...form, title: 'Fixed', status: 'Resolved' });
    const edited = (await getTicket(ref.id))!;
    expect(edited.title).toBe('Fixed');
    expect(edited.user_id).toBe(original.user_id);
    expect(edited.created_at.isEqual(original.created_at)).toBe(true);
    expect(edited.updated_at).toBeInstanceOf(Timestamp);
    expect(edited.updated_at!.toMillis()).toBeGreaterThanOrEqual(original.created_at.toMillis());
    await expect(deleteTicket(ref.id)).rejects.toMatchObject(denied);
    expect(await getTicket(ref.id)).not.toBeNull();
  });

  it.each(ticketStatuses)('accepts supported status %s on create and update', async status => {
    selectClient(await account());
    const ref = await createTicket({ ...form, status });
    await updateTicket(ref.id, { ...form, status });
    expect((await getTicket(ref.id))?.status).toBe(status);
  });

  it('queries newest first using actual server timestamps', async () => {
    selectClient(await account());
    const first = await createTicket({ ...form, title: 'First' });
    const firstTime = (await getTicket(first.id))!.created_at.toMillis();
    // Ensure distinct clock ticks without relying on arbitrary sleeps.
    await vi.waitFor(() => expect(Date.now()).toBeGreaterThan(firstTime));
    const second = await createTicket({ ...form, title: 'Second' });
    expect((await getTickets()).map(t => t.id)).toEqual([second.id, first.id]);
  });
});

const invalidCreates = [
  { title: '' }, { title: 12 }, { body: '' }, { body: false },
  { status: 'invalid' }, { priority: 'urgent' }, { extra: true },
  { user_id: 'other' }, { user_email: 'other@example.test' },
  { created_at: Timestamp.fromMillis(0) }, { created_at: 'today' },
  { updated_at: serverTimestamp() },
];
describe('Firestore Security Rules reject invalid direct writes', () => {
  it.each(invalidCreates)('rejects invalid ticket create %j', async patch => {
    const services = await account();
    await expect(setDoc(doc(services.db, 'tickets/invalid'), { ...payload(services), ...patch })).rejects.toMatchObject(denied);
  });
  it.each(['title', 'body', 'priority', 'status', 'user_id', 'user_email', 'created_at'])('requires create field %s', async field => {
    const services = await account();
    const data: Record<string, unknown> = payload(services);
    delete data[field];
    await expect(setDoc(doc(services.db, 'tickets/invalid'), data)).rejects.toMatchObject(denied);
  });
  it.each([
    { title: '' }, { body: 1 }, { status: 'invalid' }, { priority: 'high' },
    { user_id: 'other' }, { user_email: 'other@example.test' },
    { created_at: serverTimestamp() }, { extra: true },
    { updated_at: Timestamp.fromMillis(0) }, { updated_at: 'today' },
    { title: deleteField() },
  ])('rejects invalid ticket update %j', async patch => {
    const { ref } = await seed();
    await expect(updateDoc(ref, { updated_at: serverTimestamp(), ...patch })).rejects.toMatchObject(denied);
  });
  it('requires updated_at and denies unrelated collections', async () => {
    const { owner, ref } = await seed();
    await expect(updateDoc(ref, { title: 'No timestamp' })).rejects.toMatchObject(denied);
    await expect(setDoc(doc(owner.db, 'private/secret'), { value: true })).rejects.toMatchObject(denied);
    await expect(getDoc(doc(owner.db, 'private/secret'))).rejects.toMatchObject(denied);
  });
});

describe('Real-time message threads', () => {
  it('changes ticket status together with message creation and editing, or preserves it when omitted', async () => {
    const { owner, ref } = await seed();
    const id = await createTicketMessage(ref.id, 'Investigating', 'In progress');
    expect((await getTicket(ref.id))?.status).toBe('In progress');
    await updateTicketMessage(ref.id, id, 'Fixed\nVerified', 'Resolved');
    expect((await getTicket(ref.id))?.status).toBe('Resolved');
    expect((await getDoc(doc(owner.db, 'tickets', ref.id, 'messages', id))).data()?.body).toBe('Fixed\nVerified');
    await createTicketMessage(ref.id, 'Follow-up without changing status');
    await updateTicketMessage(ref.id, id, 'More details');
    expect((await getTicket(ref.id))?.status).toBe('Resolved');
  });

  it('does not change ticket status when a message edit is denied', async () => {
    const { owner, ref } = await seed();
    const id = await createTicketMessage(ref.id, 'Original');
    selectClient(await account());
    await expect(updateTicketMessage(ref.id, id, 'Forbidden edit', 'Closed')).rejects.toMatchObject(denied);
    expect((await getTicket(ref.id))?.status).toBe('Not started');
    expect((await getDoc(doc(owner.db, 'tickets', ref.id, 'messages', id))).data()?.body).toBe('Original');
  });

  it('does not save a reply when the selected status is rejected', async () => {
    const { owner, ref } = await seed();
    const invalid = 'Invalid' as Parameters<typeof createTicketMessage>[2];
    await expect(createTicketMessage(ref.id, 'Must not be saved', invalid)).rejects.toMatchObject(denied);
    expect((await getDocs(collection(owner.db, 'tickets', ref.id, 'messages'))).empty).toBe(true);
    const id = await createTicketMessage(ref.id, 'Original');
    await expect(updateTicketMessage(ref.id, id, 'Must not be saved', invalid)).rejects.toMatchObject(denied);
    expect((await getDoc(doc(owner.db, 'tickets', ref.id, 'messages', id))).data()?.body).toBe('Original');
    expect((await getTicket(ref.id))?.status).toBe('Not started');
  });

  it('delivers ordered messages from multiple verified users and updates the parent timestamp', async () => {
    const { ref } = await seed();
    const reader = await account();
    selectClient(reader);
    const received: string[][] = [];
    let listenerError: Error | undefined;
    subscriptions.push(subscribeTicketMessages(ref.id, messages => {
      received.push(messages.map(m => m.body));
      for (const message of messages) {
        expect(message.ticket_id).toBe(ref.id);
        expect(message.id).toBeTruthy();
      }
    }, error => { listenerError = error; }));
    await vi.waitFor(() => expect(received).toContainEqual([]));
    const first = await createTicketMessage(ref.id, '  First reply  ');
    await vi.waitFor(() => expect(received.at(-1)).toEqual(['First reply']));
    selectClient(await account());
    await createTicketMessage(ref.id, 'Second reply');
    await vi.waitFor(() => expect(received.at(-1)).toEqual(['First reply', 'Second reply']));
    expect(listenerError).toBeUndefined();
    const stored = await getDoc(doc(reader.db, 'tickets', ref.id, 'messages', first));
    expect(stored.data()?.created_at).toBeInstanceOf(Timestamp);
    expect((await getTicket(ref.id))!.updated_at).toBeInstanceOf(Timestamp);
    await expect(createTicketMessage(ref.id, '   ')).rejects.toThrow('cannot be empty');
  });

  it.each([
    { body: '' }, { body: 42 }, { body: 'x'.repeat(10001) },
    { user_id: 'other' }, { user_email: 'other@example.test' },
    { created_at: Timestamp.fromMillis(0) }, { created_at: 'today' }, { extra: true },
  ])('rejects an invalid message payload', async patch => {
    const { owner, ref } = await seed();
    const data = { body: 'Reply', user_id: owner.auth.currentUser!.uid,
      user_email: owner.auth.currentUser!.email, created_at: serverTimestamp() };
    await expect(setDoc(doc(ref, 'messages/invalid'), { ...data, ...patch })).rejects.toMatchObject(denied);
  });

  it.each(['body', 'user_id', 'user_email', 'created_at'])('requires message field %s', async field => {
    const { owner, ref } = await seed();
    const data: Record<string, unknown> = { body: 'Reply', user_id: owner.auth.currentUser!.uid,
      user_email: owner.auth.currentUser!.email, created_at: serverTimestamp() };
    delete data[field];
    await expect(setDoc(doc(ref, 'messages/invalid'), data)).rejects.toMatchObject(denied);
  });

  it('allows author edits with newlines while preventing forgery, other-user edits and all deletion', async () => {
    const { owner, ref } = await seed();
    const id = await createTicketMessage(ref.id, 'Permanent reply');
    await updateTicketMessage(ref.id, id, 'Changed\nSecond line');
    const stored = await getDoc(doc(owner.db, 'tickets', ref.id, 'messages', id));
    expect(stored.data()?.body).toBe('Changed\nSecond line');
    expect(stored.data()?.updated_at).toBeInstanceOf(Timestamp);
    for (const patch of [
      { body: '' }, { body: 42 }, { body: 'x'.repeat(10001) },
      { body: deleteField() }, { user_id: 'other' }, { user_email: 'other@example.test' },
      { created_at: Timestamp.fromMillis(0) }, { extra: true },
      { updated_at: Timestamp.fromMillis(0) },
    ]) {
      await expect(updateDoc(doc(owner.db, 'tickets', ref.id, 'messages', id), {
        updated_at: serverTimestamp(), ...patch,
      })).rejects.toMatchObject(denied);
    }
    const other = await account();
    await expect(updateDoc(doc(other.db, 'tickets', ref.id, 'messages', id), {
      body: 'Changed', updated_at: serverTimestamp(),
    })).rejects.toMatchObject(denied);
    for (const services of [owner, other]) {
      const message = doc(services.db, 'tickets', ref.id, 'messages', id);
      await expect(deleteDoc(message)).rejects.toMatchObject(denied);
    }
  });
});
