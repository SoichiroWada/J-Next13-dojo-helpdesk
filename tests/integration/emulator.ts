import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  applyActionCode, connectAuthEmulator, createUserWithEmailAndPassword,
  getAuth, getIdToken, reload, sendEmailVerification,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, terminate } from 'firebase/firestore';

export const projectId = 'demo-dojo-helpdesk';
// Fail before creating any Firebase client; never inherit application config.
function endpoint(variable: string, expected: string) {
  if (process.env[variable] !== expected) {
    throw new Error(`${variable} must be ${expected}; run npm run test:integration`);
  }
  return `http://${expected}`;
}
export const authUrl = endpoint('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
const firestoreUrl = endpoint('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');
const apps: FirebaseApp[] = [];

export async function emulatorRequest(url: string, method = 'GET') {
  const response = await fetch(url, { method, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Emulator ${method} failed: ${response.status} ${await response.text()}`);
  return response;
}
export async function resetEmulators() {
  await Promise.all([
    emulatorRequest(`${authUrl}/emulator/v1/projects/${projectId}/accounts`, 'DELETE'),
    emulatorRequest(`${firestoreUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`, 'DELETE'),
  ]);
}
export function client() {
  const app = initializeApp({ projectId, apiKey: 'fake-emulator-key', authDomain: `${projectId}.firebaseapp.com` }, randomUUID());
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { auth, db };
}
export async function verifyEmail(auth: ReturnType<typeof getAuth>) {
  const user = auth.currentUser!;
  await sendEmailVerification(user);
  const response = await emulatorRequest(`${authUrl}/emulator/v1/projects/${projectId}/oobCodes`);
  const { oobCodes } = await response.json() as { oobCodes: { email: string; oobCode: string; requestType: string }[] };
  const code = oobCodes.findLast(c => c.email === user.email && c.requestType === 'VERIFY_EMAIL');
  if (!code) throw new Error('Missing emulator verification code');
  await applyActionCode(auth, code.oobCode);
  await reload(user);
  await getIdToken(user, true);
}
export async function account(verified = true) {
  const services = client();
  await createUserWithEmailAndPassword(services.auth, `${randomUUID()}@example.test`, 'emulator-password');
  if (verified) await verifyEmail(services.auth);
  return services;
}
export async function cleanupClients() {
  await Promise.all(apps.splice(0).map(async app => {
    await terminate(getFirestore(app));
    await deleteApp(app);
  }));
}
