// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Debug: Verify Firebase config is loaded correctly
if (!firebaseConfig.projectId) {
  console.error("[Firebase PWA] Project ID missing. Check your .env file!");
} else {
  console.log("[Firebase PWA] Initializing with Project ID:", firebaseConfig.projectId);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
export default app;
