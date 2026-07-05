import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getFirebaseApp } from './firebaseApp'

let authInstance: Auth | null = null

function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
  }
  return authInstance
}

const googleProvider = new GoogleAuthProvider()

export function subscribeAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback)
}

export async function getIdToken(): Promise<string | null> {
  const user = getAuthInstance().currentUser
  if (!user) {
    return null
  }
  return user.getIdToken()
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getAuthInstance(), googleProvider)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuthInstance())
}
