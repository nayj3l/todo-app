import type { AuthUser } from '../types/auth'
import { assertFirebaseConfigured, isFirebaseConfigured } from '../lib/firebaseApp'
import {
  signInWithGoogle as firebaseSignIn,
  signOut as firebaseSignOut,
  subscribeAuth,
} from '../lib/firebaseAuth'
import { apiFetch } from './client'

export { subscribeAuth, isFirebaseConfigured }

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await apiFetch('/api/auth/me')
  if (response.status === 401) {
    return null
  }
  if (response.status === 503) {
    const body = await response.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ??
        'Google Sign-In is unavailable on the server. Use guest mode, or ask your admin to set FIREBASE_CREDENTIALS_PATH and restart the backend.',
    )
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Failed to check sign-in status')
  }
  const user = await response.json()
  return {
    ...user,
    mode: 'google',
  }
}

export async function signInWithGoogle(): Promise<void> {
  assertFirebaseConfigured()
  await firebaseSignIn()
}

export async function completeGoogleSignIn(): Promise<AuthUser> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error(
      'Could not verify your account with the server. Ensure the backend is running with FIREBASE_CREDENTIALS_PATH set to your Firebase service account JSON.',
    )
  }
  return currentUser
}

export async function signOutGoogle(): Promise<void> {
  await firebaseSignOut()
}
