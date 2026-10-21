import { spawn } from 'node:child_process';

// Override inherited .env.local / CI production values, including any public
// Firebase variables added later. Never reuse the ordinary development server.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('NEXT_PUBLIC_FIREBASE_') && !key.startsWith('NEXT_PUBLIC_FIRESTORE_')));
Object.assign(env, {
  NODE_ENV: 'development',
  NEXT_PUBLIC_E2E_TEST: 'true',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-emulator-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-dojo-helpdesk.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-dojo-helpdesk',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-dojo-helpdesk.invalid',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-e2e-app',
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  NEXT_TELEMETRY_DISABLED: '1',
});
if (env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
  || env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080'
  || env.GCLOUD_PROJECT !== 'demo-dojo-helpdesk') {
  throw new Error('Start E2E through npm run test:e2e with the dedicated demo emulators.');
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3000'], {
  env, stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
