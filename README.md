# Dojo Helpdesk

Next.js App Router with Firebase Authentication and Cloud Firestore. The existing
framework versions and UI are preserved.

## Firebase setup

1. Create a Firebase project and register a Web app in Project settings.
2. Copy .env.local.example to .env.local and fill all six values from the Web app
   configuration. Restart development after changing environment variables.
   Configure the same variables in your hosting environment before building.
   Never commit .env.local or service-account credentials.
3. In Authentication > Sign-in method, enable Email/Password.
4. In Authentication > Settings > Authorized domains, add localhost and your
   deployed hostname. Add any development hostname you actually use.
5. In Authentication > Templates, configure the verification email if desired.
   Keep Firebase's hosted email action handler. The app supplies /login as the
   continue URL; its hostname must be authorized.
6. Create the default Cloud Firestore database and choose its region.
7. In Firestore > Rules, replace the rules with firestore.rules and Publish.
   Do this before using the app; do not leave the database in test mode.

The tickets collection is created by the first successful ticket submission.
No Storage setup or Admin SDK is required.

## Run

```sh
npm install
npm run dev
npm run build
npm start
```

## Authentication and data access

The browser SDK persists authentication. AuthProvider waits for the initial
session; the dashboard layout redirects guests to /login and unverified users
to /verify. Signup sends a verification email. The verification page can resend
it or reload the user and refresh the ID token after the link is opened.
A user whose initial verification email fails can resend from that page.

Ticket reads, creates, and deletes run in the browser. Firestore rules, rather
than client navigation, enforce authorization: verified users can read all
tickets, create with their own UID/email, and delete only their own documents.
Updates and access to other collections are denied. Each document contains
title, body, priority, user_id, user_email, and a server-generated created_at
timestamp. Document IDs are the ticket IDs; lists show newest tickets first.

Static page content can remain server-rendered; session-dependent layouts and
ticket views are client components. Ticket titles update after loading.
Missing tickets show the existing not-found UI but do not set an HTTP 404 status.
The old ticket mutation endpoints and cookie session proxy are removed.
The unrelated legacy /api/[id] JSON-server route is unchanged.

Existing accounts and ticket records are not imported. Data migration is a
separate task.

## Manual verification

After configuring Firebase and publishing rules:
- Sign up, follow the verification email, and check verification in the app.
- Log out and log in; confirm Navbar displays your email.
- Open / and /tickets while logged out; confirm redirect to /login.
- Create a ticket; confirm all six fields and a timestamp in Firestore.
- View the list and details, then delete your own ticket.
- Sign in as a second verified user; read the first user's ticket and confirm
  no Delete button. Confirm a direct delete request is rejected by rules.
- In Rules Playground or the emulator, confirm unauthenticated/unverified reads,
  forged UID/email creates, non-owner deletes, and all updates are rejected.
