import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  getApp: vi.fn(), getApps: vi.fn(), initializeApp: vi.fn(),
  getAuth: vi.fn(), getFirestore: vi.fn(),
  connectAuthEmulator: vi.fn(), connectFirestoreEmulator: vi.fn(),
}));
vi.mock('firebase/app', () => sdk);
vi.mock('firebase/auth', () => sdk);
vi.mock('firebase/firestore', () => sdk);

const valid = {
  NODE_ENV: 'development', NEXT_PUBLIC_E2E_TEST: 'true',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-emulator-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-dojo-helpdesk.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-dojo-helpdesk',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-dojo-helpdesk.invalid',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-e2e-app',
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
  vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:3000' } });
  sdk.getApps.mockReturnValue([]);
  sdk.initializeApp.mockReturnValue({ name: 'test' });
  sdk.getAuth.mockReturnValue({ name: 'auth' });
  sdk.getFirestore.mockReturnValue({ name: 'firestore' });
});

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Firebase E2E initialization safety', () => {
  it.each([
    ['NODE_ENV', 'production'], ['NEXT_PUBLIC_E2E_TEST', 'false'],
    ['NEXT_PUBLIC_E2E_TEST', undefined],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'real-project'],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-other-project'],
    ['NEXT_PUBLIC_FIREBASE_API_KEY', 'real-key'],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'real.firebaseapp.com'],
    ['NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL', undefined],
    ['NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL', 'https://identitytoolkit.googleapis.com'],
    ['NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL', 'http://localhost:9099'],
    ['NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST', undefined],
    ['NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST', 'firestore.googleapis.com:443'],
  ])('rejects unsafe %s=%s before initialization', async (key, value) => {
    vi.stubEnv(key, value);
    const { getFirebase } = await import('@/utils/firebase/client');
    expect(() => getFirebase()).toThrow();
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    expect(sdk.getAuth).not.toHaveBeenCalled();
  });
  it('rejects unexpected browser origins', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
    const { getFirebase } = await import('@/utils/firebase/client');
    expect(() => getFirebase()).toThrow('dedicated local development server');
    expect(sdk.initializeApp).not.toHaveBeenCalled();
  });
  it('rejects an already initialized app', async () => {
    sdk.getApps.mockReturnValue([{ name: 'existing' }]);
    const { getFirebase } = await import('@/utils/firebase/client');
    expect(() => getFirebase()).toThrow('fresh Firebase app');
    expect(sdk.getAuth).not.toHaveBeenCalled();
  });
  it('connects both emulators before returning and only once', async () => {
    const { getFirebase } = await import('@/utils/firebase/client');
    expect(getFirebase()).toBe(getFirebase());
    expect(sdk.connectAuthEmulator).toHaveBeenCalledExactlyOnceWith({ name: 'auth' }, 'http://127.0.0.1:9099', { disableWarnings: true });
    expect(sdk.connectFirestoreEmulator).toHaveBeenCalledExactlyOnceWith({ name: 'firestore' }, '127.0.0.1', 8080);
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
  });
  it('preserves production initialization when E2E is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_E2E_TEST', undefined);
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST', undefined);
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'production-project');
    const { getFirebase } = await import('@/utils/firebase/client');
    getFirebase();
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
    expect(sdk.connectFirestoreEmulator).not.toHaveBeenCalled();
  });
});

describe('Next.js E2E build safety', () => {
  it.each(['phase-production-build', 'phase-production-server'])('refuses emulator mode during %s', async phase => {
    const { default: config } = await import('../next.config');
    expect(() => config(phase)).toThrow('forbidden in production');
  });
  it('uses separate output only for explicitly enabled development', async () => {
    const { default: config } = await import('../next.config');
    expect(config('phase-development-server').distDir).toBe('.next-e2e');
    vi.stubEnv('NEXT_PUBLIC_E2E_TEST', undefined);
    expect(config('phase-production-build').distDir).toBeUndefined();
  });
});
