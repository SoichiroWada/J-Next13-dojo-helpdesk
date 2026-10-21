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

## Chromium browser E2E tests

Run `npm run test:e2e`. Playwright 1.64.1 and Chromium are reused locally.
For a new machine, run `npm ci` and `npx playwright install --with-deps chromium`
(the OS dependency install may require sudo). Java 21 and Node.js 22+ are required.
In addition to the emulator ports above, port 3000 must be available.
Run integration and E2E suites sequentially: they reset the same demo project.

`firebase emulators:exec` starts Auth/Firestore with the existing rules and stops
both on exit. Playwright starts a dedicated Next.js **development** server using
webpack on `http://127.0.0.1:3000`, refuses to reuse an existing server, and sends
SIGTERM to the server process group with a bounded SIGKILL fallback. The launcher
forwards signals to Next.js. Output goes in `.next-e2e`, separate from `.next`.
No production build is used for E2E; the normal build command remains unchanged.
Next.js adds the E2E generated type paths to tsconfig.json and creates
AGENTS.md with local framework guidance when it detects an agent-run dev session.

Safety controls:

- The launcher overrides inherited public Firebase configuration with fake values.
  It requires emulator host variables and `GCLOUD_PROJECT=demo-dojo-helpdesk`
  supplied by `emulators:exec`. No local secrets or Firebase login are needed.
- Browser SDK initialization requires `NEXT_PUBLIC_E2E_TEST=true`, development
  mode, the exact loopback origin, the exact demo project, fake key/auth domain,
  and both exact emulator endpoints. Invalid or missing settings throw before
  initialization; existing Firebase apps are rejected. Both emulators connect
  synchronously before services are exposed. A demo configuration without the
  explicit flag also throws rather than falling back to public Firebase.
- Next.js configuration rejects the E2E flag for production builds/servers, and
  the browser client independently refuses E2E mode in production. Never put
  E2E variables in production deployment environments.
- The browser context blocks all HTTP requests except the app and the two
  emulators, blocks WebSockets except Next.js HMR, disables service workers,
  and fails the test if any forbidden request is attempted. These guards cover
  secondary pages and verification links too. Fixtures only use explicitly
  connected emulator SDK clients; email links are validated before navigation.
- Each test gets a new browser context and resets Auth/Firestore before creating
  deterministic owner, colleague, and unverified test accounts. One worker runs
  without retries. Fixture clients and secondary pages are closed after use.

The 10 browser tests cover guest/verified/unverified redirects, login/logout and
session persistence, invalid credentials and disabled submission, signup/resend
and emulator email verification with token refresh, required form validation,
ticket creation/persistence, shared editing/status updates, delete cancellation
and confirmation by a colleague, message delivery between two open pages without
reload, and real rule-rejection error recovery. Browser tests use the real app
and rules. They do not alter business behavior or implement owner-only access.

`tests/firebase-client.test.ts` adds 19 offline guard regression tests alongside
the existing 74 unit tests. GitHub Actions installs Chromium, reuses Java 21,
runs the E2E command, and uploads HTML reports, traces, screenshots, and videos
on failure (7-day retention). Locally inspect `playwright-report/` with
`npx playwright show-report`, or use `npx playwright show-trace <trace.zip>`.
Artifacts contain only local emulator accounts/data; output directories are ignored.

The Next.js dev server and production build can require access to Google Fonts
for `next/font/google`. This server-side font download is separate from browser
network interception. Restricted environments must permit localhost listeners,
Chromium sandbox/process startup, and any initial CLI/browser/font downloads.
A forced machine shutdown or SIGKILL cannot execute graceful cleanup; on an
ordinary success/failure/interrupt, the process owners stop their children.

Requested CI checks:

```sh
npm test
npm run test:integration
npm run test:e2e
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

The production build uses `next/font/google` for Rubik and may require network
access to Google Fonts. Application Firebase access is browser-only and lazy;
these unit tests and build checks do not perform production CRUD.

Local validation on 2026-10-21: 10 E2E tests, 57 integration tests, and 93 unit
tests passed, as did lint, route type generation, TypeScript, and a webpack
production build. The default Turbopack build was attempted normally and with
sandbox permission escalation; both failed while binding a worker port with
`Operation not permitted (os error 1)`. The build script was left unchanged.
The E2E and integration runs required permission to bind local ports in this
restricted environment. A flagged production build was separately confirmed to
fail before compilation. A final listener/process check found no test services
or browsers remaining after completion.
