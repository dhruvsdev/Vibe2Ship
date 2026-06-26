import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Safe Build-Time Guard: Only initialize Firebase if we are running in the 
// browser (client-side) or if the API key environment variable is present.
// This prevents Next.js from throwing auth/invalid-api-key crashes during Vercel's pre-render phase.
const shouldInitialize = typeof window !== "undefined" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let app;
let auth: any;
let db: any;
let googleProvider: any;

if (shouldInitialize) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app); // Initialize Firestore
  googleProvider = new GoogleAuthProvider();
} else {
  // Safe mock exports to let the Next.js compiler pass build-time page pre-rendering
  app = {} as any;
  auth = {} as any;
  db = {} as any;
  googleProvider = {} as any;
}

export { auth, db, googleProvider };