# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev      # Next.js dev server
npm run build    # production build (also type-checks)
npm run lint     # ESLint (flat config, eslint-config-next core-web-vitals)
npx tsc --noEmit # type-check only
```

There is no test suite. Verification is manual (see the checklist in README.md); Firestore rule changes should be checked in the Firebase Rules Playground or emulator.

The app requires `.env.local` with the six `NEXT_PUBLIC_FIREBASE_*` values from `.env.local.example`; `getFirebase()` throws if any are missing.

## Architecture

Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind 3, backed by Firebase Auth (email/password) and Cloud Firestore. **There is no server-side data layer**: no API routes, no Admin SDK, no session cookies. All auth and Firestore access happens in the browser, and `firestore.rules` is the only authorization boundary.

- **Firebase access** — `utils/firebase/client.ts` exposes `getFirebase()`, which lazily initializes the client SDK and throws on the server. Anything calling it must be a client component and run after mount. Ticket CRUD lives in `utils/firebase/tickets.ts` and message CRUD/listeners in `utils/firebase/messages.ts`.
- **Auth state** — `app/components/AuthProvider.tsx` (mounted in the root layout) subscribes to `onIdTokenChanged` and exposes `{ user, loading, error, refreshUser }` via `useAuth()`. `refreshUser` reloads the user and forces an ID-token refresh so `email_verified` reaches Firestore rules after verification.
- **Route groups** — `app/(auth)` (login/signup/verify) and `app/(dashboard)` (home, tickets) each have a client layout that redirects based on auth state: dashboard sends guests to `/login` and unverified users to `/verify`; auth layout sends verified users to `/`. This is UX only — rules enforce access.
- **Pages load data client-side** — ticket pages are `"use client"`, read `id` via `useParams`, fetch in `useEffect` with an `active` flag for cleanup, and track `TicketLoadState` (`types/ticket.ts`) keyed by `id` to show `Loading` until the current id resolves. Document titles are set manually; missing tickets render the `not-found` component without a 404 status.
- **Shared types** live in `types/` and are imported via the `@/*` path alias (repo root).

## Ticket and Message data model and rules coupling

Firestore `tickets/{id}` documents: `title`, `body`, `priority`, `status`, `user_id`, `user_email`, `created_at`, optional `updated_at`. The UI has moved from priority to **status** (`TicketStatus` / `ticketStatuses` in `types/ticket.ts`, rendered by `StatusBadge`):

- Forms only edit `title`, `body`, `status` (`TicketFormData`).
- `createTicket` still writes `priority: "low"` because the rules require a valid `priority` on create and on update.
- Updates may only change `title`, `body`, `status`, `updated_at`; creator fields and `created_at` are immutable. Timestamps must be `serverTimestamp()` (rules compare to `request.time`).
- Legacy docs without `status` are normalized to `"Not started"` on read (display only; reads never write).

Firestore `tickets/{id}/messages/{messageId}` subcollection documents: `body`, `user_id`, `user_email`, `created_at`:
- Verified email required to read and create.
- Immutable: `update` and `delete` are denied by rules.
- Real-time listening uses `onSnapshot` via `subscribeTicketMessages`.

When changing ticket or message fields or status values, update `types/`, `utils/firebase/`, and `firestore.rules` together, then republish the rules in the Firebase console. Note that README.md still describes `priority` as editable and mentions a legacy `/api/[id]` route that no longer exists; the code and rules are authoritative.
