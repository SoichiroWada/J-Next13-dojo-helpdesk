import { test as base, expect, type Page } from '@playwright/test';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { authUrl, cleanupClients, client, emulatorRequest, projectId, resetEmulators, verifyEmail } from '../integration/emulator';

export const users = {
  owner: 'owner@example.test',
  colleague: 'colleague@example.test',
  unverified: 'unverified@example.test',
  password: 'Emulator-password-123',
};
const allowedOrigins = new Set(['http://127.0.0.1:3000', 'http://127.0.0.1:9099', 'http://127.0.0.1:8080']);

export const test = base.extend({
  context: async ({ context }, runWithContext) => {
    const violations: string[] = [];
    // Installed before any page exists. Covers popups and every page in this
    // context. Abort first, then fail teardown so fallback cannot go unnoticed.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (allowedOrigins.has(url.origin) && !url.username && !url.password) await route.continue();
      else { violations.push(url.href); await route.abort('blockedbyclient'); }
    });
    await context.routeWebSocket(/.*/, socket => {
      const url = new URL(socket.url());
      // Only Next.js HMR is needed; Firebase uses HTTP streams here.
      if (url.origin === 'ws://127.0.0.1:3000') socket.connectToServer();
      else { violations.push(url.href); socket.close(); }
    });
    await resetEmulators();
    try {
      for (const email of [users.owner, users.colleague, users.unverified]) {
        const services = client();
        await createUserWithEmailAndPassword(services.auth, email, users.password);
        if (email !== users.unverified) await verifyEmail(services.auth);
      }
      await runWithContext(context);
    } finally {
      await cleanupClients();
      expect(violations, 'Browser attempted requests outside the local E2E allowlist').toEqual([]);
    }
  },
});
export { expect };

export async function login(page: Page, email = users.owner) {
  await page.goto('/login');
  await page.getByLabel('Email:').fill(email);
  await page.getByLabel('Password:').fill(users.password);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

export async function createTicket(page: Page, title = 'Printer paper jam') {
  await page.goto('/tickets/create');
  await page.getByLabel('Title:').fill(title);
  await page.getByLabel('Body:').fill('The office printer needs attention.');
  await page.getByRole('button', { name: 'Add Ticket' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/tickets');
  await page.getByRole('heading', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ticket Details', exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

export async function verificationLink(email: string) {
  const response = await emulatorRequest(`${authUrl}/emulator/v1/projects/${projectId}/oobCodes`);
  const { oobCodes } = await response.json() as { oobCodes: { email: string; oobLink: string; requestType: string }[] };
  const code = oobCodes.findLast(c => c.email === email && c.requestType === 'VERIFY_EMAIL');
  if (!code) throw new Error('Missing local verification email');
  const link = new URL(code.oobLink);
  if (link.origin !== authUrl || link.pathname !== '/emulator/action') throw new Error('Unsafe verification URL');
  // Stay on the emulator confirmation page; do not load a second app tab
  // via the signup continueUrl and refresh the first tab's token indirectly.
  link.searchParams.delete('continueUrl');
  return link.href;
}
