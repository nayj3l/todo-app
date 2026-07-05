import { initializeApp, type FirebaseApp } from 'firebase/app'

function env(key: string): string {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : ''
}

const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: env('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID'),
}

function missingFirebaseKeys(): string[] {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

export const isFirebaseConfigured = missingFirebaseKeys().length === 0

export const firebaseProjectId = firebaseConfig.projectId

let firebaseApp: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured')
  }
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig)
  }
  return firebaseApp
}

export function assertFirebaseConfigured() {
  const missing = missingFirebaseKeys()
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}. Copy frontend/.env.example to .env.local`)
  }
}
