// Client-only Firebase initialisation. The web config is public by design
// (access is enforced by Firebase security rules), so defaults are safe.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const env = import.meta.env as Record<string, string | undefined>;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDygOakJGlZr6G_UKySj0mgpArNvQKx3AI",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "waslapp-6a171.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "waslapp-6a171",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "waslapp-6a171.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "264054649740",
  appId: env.VITE_FIREBASE_APP_ID || "1:264054649740:web:2e55d0e2b6c67e61ef1ca9",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-VMWQ71YT67",
};

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let analyticsStarted = false;

/** Browser-only; safe to call from effects. No-op during SSR or when unsupported. */
export async function initFirebaseAnalytics(): Promise<void> {
  if (typeof window === "undefined" || analyticsStarted) return;
  analyticsStarted = true;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) getAnalytics(getFirebaseApp());
  } catch {
    // analytics is optional; never break the app
  }
}

if (typeof window !== "undefined") {
  getFirebaseApp();
  void initFirebaseAnalytics();
}
