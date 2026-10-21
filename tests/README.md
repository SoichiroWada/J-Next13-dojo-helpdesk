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

## Integration coverage still needed

Use an isolated Firebase Emulator project for real Auth/Firestore behavior:

- Rules reject guest/unverified access, empty or non-string title/body, invalid
  or missing status/priority, unexpected fields, forged UID/email, and invalid
  timestamps; immutable creator fields and creation time remain protected.
- Verified CRUD, actual server timestamps, missing-document updates, and real
  query ordering/legacy-document reads. Unit tests inspect the query and payload
  sent to mocks; they do not prove that Firebase enforces or persists them.
- Rule-authorized edits/deletes by another verified user and message rules,
  listeners and delivery.

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
