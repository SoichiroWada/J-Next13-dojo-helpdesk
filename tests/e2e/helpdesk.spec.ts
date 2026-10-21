import { createTicket, expect, login, test, users, verificationLink } from './fixtures';

test('guests are redirected from protected routes', async ({ page }) => {
  for (const route of ['/', '/tickets', '/tickets/create', '/tickets/missing', '/tickets/missing/edit']) {
    await page.goto(route);
    await expect(page).toHaveURL('http://127.0.0.1:3000/login');
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  }
});

test('verified users log in, persist their session, redirect away from auth pages, and log out', async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  for (const route of ['/login', '/signup', '/verify']) {
    await page.goto(route);
    await expect(page).toHaveURL('http://127.0.0.1:3000/');
  }
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/login');
  await page.goto('/tickets');
  await expect(page).toHaveURL('http://127.0.0.1:3000/login');
});

test('invalid credentials show an error and submission has a disabled loading state', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('http://127.0.0.1:9099/**/accounts:signInWithPassword*', async route => {
    await gate;
    await route.fallback(); // Preserve the context's network safety guard.
  });
  await page.goto('/login');
  await page.getByLabel('Email:').fill(users.owner);
  await page.getByLabel('Password:').fill('incorrect-password');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  try {
    await expect(page.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  } finally { release(); }
  await expect(page.locator('.error')).toContainText('Firebase: Error');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  await expect(page).toHaveURL('http://127.0.0.1:3000/login');
});

test('unverified users are restricted to verification and can log out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email:').fill(users.unverified);
  await page.getByLabel('Password:').fill(users.password);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/verify');
  await page.goto('/tickets/create');
  await expect(page).toHaveURL('http://127.0.0.1:3000/verify');
  await expect(page.getByRole('button', { name: 'Add Ticket' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/login');
});

test('signup, resend, local verification link and refreshed email verification unlock the dashboard', async ({ page, context }) => {
  const email = 'signup@example.test';
  await page.goto('/signup');
  await page.getByLabel('Email:').fill(email);
  await page.getByLabel('Password:').fill(users.password);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/verify');
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page.getByRole('status')).toContainText('has not been verified yet');
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await expect(page.getByRole('status')).toContainText('Verification email sent');
  const inbox = await context.newPage();
  await inbox.goto(await verificationLink(email));
  await expect(inbox.locator('body')).toContainText('verified');
  await inbox.close();
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('required ticket fields prevent submission and created tickets persist after reload', async ({ page }) => {
  await login(page);
  await page.goto('/tickets/create');
  await page.getByRole('button', { name: 'Add Ticket' }).click();
  expect(await page.getByLabel('Title:').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL('http://127.0.0.1:3000/tickets/create');
  await page.getByLabel('Title:').fill('Title without a body');
  await page.getByRole('button', { name: 'Add Ticket' }).click();
  expect(await page.getByLabel('Body:').evaluate((input: HTMLTextAreaElement) => input.validity.valueMissing)).toBe(true);
  await createTicket(page);
  await expect(page.getByText(`Created by: ${users.owner}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Status: Not started', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Created at:/)).not.toContainText('Just now');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Printer paper jam', exact: true })).toBeVisible();
});

test('another verified user edits ticket text and status under the shared policy', async ({ page }) => {
  await login(page);
  const path = await createTicket(page);
  await page.getByRole('button', { name: 'Logout' }).click();
  await login(page, users.colleague);
  await page.goto(path);
  await page.getByRole('button', { name: 'Edit Ticket' }).click();
  await expect(page.getByLabel('Title:')).toHaveValue('Printer paper jam');
  await page.getByLabel('Title:').fill('Printer repaired');
  await page.getByLabel('Body:').fill('Replaced the damaged paper tray.\nVerified printing.');
  await page.getByLabel('Status:').selectOption('Resolved');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3000${path}`);
  await expect(page.getByRole('heading', { name: 'Printer repaired', exact: true })).toBeVisible();
  await expect(page.getByText('Status: Resolved', { exact: true })).toBeVisible();
  await expect(page.getByText(`Created by: ${users.owner}`, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Updated at:/)).not.toContainText('Just now');
  await page.reload();
  await expect(page.getByText('Replaced the damaged paper tray.\nVerified printing.', { exact: true })).toBeVisible();
});

test('tickets have no deletion button for either verified user', async ({ page }) => {
  await login(page);
  const path = await createTicket(page);
  await expect(page.getByRole('button', { name: 'Delete Ticket' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logout' }).click();
  await login(page, users.colleague);
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Delete Ticket' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Printer paper jam', exact: true })).toBeVisible();
});

test('messages appear live in a second page without a reload and persist', async ({ page, context }) => {
  await login(page);
  const path = await createTicket(page);
  await expect(page.getByText('No messages yet.', { exact: false })).toBeVisible();
  const observer = await context.newPage();
  await observer.goto(path);
  await expect(observer.getByRole('heading', { name: 'Conversation (0)' })).toBeVisible();
  const input = page.getByPlaceholder('Type your message or response here...');
  await expect(page.getByRole('button', { name: 'Send Reply' })).toBeDisabled();
  await input.fill('  First update from the browser  ');
  await page.getByLabel('Ticket status:').selectOption('In progress');
  await page.getByRole('button', { name: 'Send Reply' }).click();
  await expect(observer.getByText('First update from the browser', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(page.getByText('Status: In progress', { exact: true })).toBeVisible();
  await observer.getByPlaceholder('Type your message or response here...').fill('Acknowledged in the second page');
  await observer.getByRole('button', { name: 'Send Reply' }).click();
  await expect(page.getByText('Acknowledged in the second page', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conversation (2)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Conversation (2)' })).toBeVisible();
  const replyCard = page.locator('div.rounded-lg').filter({ hasText: 'First update from the browser' });
  const displayWidth = (await replyCard.boundingBox())!.width;
  await page.getByRole('button', { name: 'Edit Reply', exact: true }).first().click();
  expect((await replyCard.boundingBox())!.width).toBeGreaterThanOrEqual(displayWidth - 1);
  expect((await page.getByLabel('Edit reply:').boundingBox())!.width).toBeGreaterThan(displayWidth * 0.8);
  await page.getByLabel('Edit reply:').fill('Discard this');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('First update from the browser', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Reply', exact: true }).first().click();
  await page.getByLabel('Edit reply:').fill('Edited first update\nSecond line');
  await page.getByLabel('Ticket status:').first().selectOption('Resolved');
  await page.getByRole('button', { name: 'Save Reply', exact: true }).click();
  await expect(page.getByText('Status: Resolved', { exact: true })).toBeVisible();
  const edited = observer.getByText('Edited first update\nSecond line', { exact: true });
  await expect(edited).toBeVisible();
  expect(await edited.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  await page.reload();
  await expect(page.getByText('Edited first update\nSecond line', { exact: true })).toBeVisible();
  await expect(page.getByText('Status: Resolved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await login(page, users.colleague);
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Edit Reply', exact: true })).toHaveCount(0);
  await observer.close();
});

test('message rule rejection displays an error and allows retry', async ({ page }) => {
  await login(page);
  await createTicket(page);
  const input = page.getByPlaceholder('Type your message or response here...');
  await input.evaluate(element => element.removeAttribute('maxlength'));
  await input.fill('x'.repeat(10001));
  await page.getByRole('button', { name: 'Send Reply' }).click();
  await expect(page.locator('.error')).toContainText(/PERMISSION_DENIED|Missing or insufficient permissions/);
  await expect(page.getByRole('button', { name: 'Send Reply' })).toBeEnabled();
  await input.fill('Valid reply after rejection');
  await page.getByRole('button', { name: 'Send Reply' }).click();
  await expect(
    page.locator('div.rounded-lg').filter({
      hasText: /Valid reply after rejection/,
    })
  ).toBeVisible();
  await expect(page.locator('.error')).toHaveCount(0);
});
