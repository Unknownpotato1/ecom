/**
 * Client-side Firebase Auth.
 * Initialized lazily from NEXT_PUBLIC_FIREBASE_* env vars.
 * When env vars are missing, exports `firebaseAuth` as null and the app falls back to demo mode.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let googleProvider: GoogleAuthProvider | null = null

function init(): boolean {
  if (app) return true
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!apiKey || !projectId) {
    return false
  }
  app = initializeApp({
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  })
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  googleProvider.setCustomParameters({ prompt: 'select_account' })
  return true
}

export function getFirebaseAuth(): { auth: Auth; googleProvider: GoogleAuthProvider } | null {
  if (!init()) return null
  return { auth: auth!, googleProvider: googleProvider! }
}

export function isFirebaseClientAvailable(): boolean {
  return init()
}
