# Offline unit tests

Run `npm test`. Vitest uses Node and the same `@/` alias as TypeScript. No new
dependencies, Firebase credentials, browser, or running emulator are needed.

- `tickets.test.ts`: mocked Firestore and Firebase initialization boundaries;
  all seven statuses, legacy missing/null status defaults without writes or
  mutation, authoritative document IDs, missing/empty results, newest-first
  query construction, verified-email create guard, create ownership/default
  priority/server timestamp, editable-field allowlist, text preservation, and
  propagation of SDK failures.
- `date.test.ts`: Japanese Tokyo date/time output, seconds and zero padding,
  midnight/year/leap-day boundaries, epoch, explicit input offset, unresolved
  and malformed values, invalid Date and failing `toDate` behavior. The current
  formatter returns `Just now` for missing/non-callable `toDate`, but throws for
  an invalid Date or a failing `toDate`; these tests preserve that behavior.
- `ticket-ui.test.tsx`: static rendering of status labels/colors, supported
  form options, new-ticket defaults, edit prefilling, and required title/body
  attributes. Static markup does not exercise browser validation or events.
- `basic.test.ts`: the existing smoke tests.

## Firebase emulator integration tests

Run `npm ci`, then `npm run test:integration`. Requires Node.js 22 or later,
Java 21 on PATH, and free loopback ports 8080 (Firestore), 9099 (Auth),
4400/4500 (emulator coordination), and 9150 (Firestore websocket).
The first run needs network access to download the Firestore emulator binary.
The Firebase CLI is locked in package-lock.json. No Firebase login, credentials,
production environment variables, or real Firebase project are required.

The script starts Auth and Firestore with the repository's actual rules, runs
`vitest.integration.config.mjs`, and stops the emulators even if tests fail.
It explicitly selects `demo-dojo-helpdesk`, overriding the production alias in
`.firebaserc`. Demo projects have no live Firebase resources. Clients use fake
configuration and connect to both emulators before any requests. The integration
helper refuses to initialize unless both emulator host variables exactly match
the configured loopback addresses; invoking this Vitest config alone fails closed.
Application Firebase initialization is replaced only at the configuration boundary;
Firestore/Auth SDKs and ticket/message service implementations run unchanged.
Do not run a second emulator suite on these ports concurrently.

Tests are sequential and clear all Auth accounts and Firestore documents before
each case. Clients/listeners are disposed after each case. Coverage includes real
email/password signup, emulator email verification codes, refreshed tokens,
signout/signin, guest/unverified denial, ticket CRUD, all statuses, ownership
forgery, immutable fields, field validation, server timestamps, newest-first
queries, ordered live message delivery across users, and message immutability.
The current rules deliberately permit all verified users to read, edit, and delete
any ticket, and read/post messages on any thread. These tests preserve that policy;
there is no owner-only edit/delete restriction or parent-existence check in the
current rules. The suite does not change those rules or application behavior.

GitHub Actions installs Java 21 and runs the same integration command without
Firebase secrets. Emulator debug logs and local `.firebase` state are ignored.

Use Playwright with the emulator for required-field enforcement, changing status
and submitting create/edit forms, disabled/loading states and duplicate-submit
protection, error display, redirects, list/detail refresh, missing-ticket UI,
delete confirmation/cancellation, authentication and email-verification flows.
The service has no title/body/status runtime validator; it relies on browser
constraints and Firestore rules. Mock rejection tests prove error propagation,
not server-side rejection of invalid input. Do not run these integration flows
against production data.

Requested CI checks:

```sh
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

The production build uses `next/font/google` for Rubik and may require network
access to Google Fonts. Application Firebase access is browser-only and lazy;
these unit tests and build checks do not perform production CRUD.
