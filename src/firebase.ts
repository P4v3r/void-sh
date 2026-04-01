// src/firebase.ts
// Firebase Realtime DB - ONLY for WebRTC signaling (offer/answer/ICE)
// Files NEVER touch Firebase - they go direct P2P via WebRTC

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, get, serverTimestamp } from 'firebase/database';

// TODO: Replace with your Firebase project config
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (free Spark plan)
// 3. Enable Realtime Database (test mode is fine)
// 4. Copy config from Project Settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, set, push, remove, get, serverTimestamp };
