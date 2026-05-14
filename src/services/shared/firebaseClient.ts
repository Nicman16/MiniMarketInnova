import { initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'minimarket-21bdb';
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const hasClientFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.projectId);

if (!hasClientFirebaseConfig) {
  console.warn('Firebase Web SDK incompleto. Se usara fallback por API para inventario.');
}

const app = hasClientFirebaseConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const db: Firestore | null = app ? getFirestore(app) : null;
export const firebaseProjectId = projectId;
export const isFirebaseClientConfigured = hasClientFirebaseConfig;
