"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

let e2eServices: FirebaseServices | undefined;

export function getFirebase(): FirebaseServices {
  if (typeof window === "undefined") {
    throw new Error("Firebase browser services must be used on the client.");
  }
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const flag = process.env.NEXT_PUBLIC_E2E_TEST;
  if (flag && flag !== "true") throw new Error("Invalid E2E test flag.");
  if (flag === "true") {
    // Validate before initializing either SDK. Missing/invalid values never fall
    // through to the production configuration, even in a misconfigured browser.
    if (process.env.NODE_ENV !== "development" || window.location.origin !== "http://127.0.0.1:3000") {
      throw new Error("Firebase E2E mode requires the dedicated local development server.");
    }
    if (config.projectId !== "demo-dojo-helpdesk" || config.apiKey !== "fake-emulator-key"
      || config.authDomain !== "demo-dojo-helpdesk.firebaseapp.com"
      || process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL !== "http://127.0.0.1:9099"
      || process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080") {
      throw new Error("Invalid or missing Firebase E2E demo/emulator configuration.");
    }
    if (e2eServices) return e2eServices;
    // Refuse to reuse an app whose services might already have made live calls.
    if (getApps().length) throw new Error("Firebase E2E mode requires a fresh Firebase app.");
    const app = initializeApp(config, "dojo-helpdesk-e2e");
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    e2eServices = { auth, db };
    return e2eServices;
  }
  // A demo configuration without the explicit flag is a setup error, never a
  // reason to silently send requests to Firebase's public endpoints.
  if (config.projectId?.startsWith("demo-")
    || process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL
    || process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firebase emulator configuration requires the explicit E2E test flag.");
  }
  if (Object.values(config).some((value) => !value)) {
    throw new Error("Missing Firebase configuration. Configure .env.local using .env.local.example.");
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}
