// Use require for firebase-admin to avoid CJS/ESM interop issues on Vercel.
// The `import admin from 'firebase-admin'` default import doesn't correctly
// expose admin.credential.cert when bundled by Next.js Turbopack.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin') as typeof import('firebase-admin')

/**
 * Server-side Firebase Admin SDK.
 * Initialized lazily from the FIREBASE_SERVICE_ACCOUNT env var (full JSON string).
 * In development without env vars, exports undefined and the app falls back to demo mode.
 */

let adminApp: admin.app.App | null = null
let initError: string | null = null

function init(): admin.app.App | null {
  if (adminApp) return adminApp
  if (initError) return null

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    initError = 'FIREBASE_SERVICE_ACCOUNT not set'
    return null
  }

  try {
    const sa = JSON.parse(raw)
    // The private_key from JSON has literal \n sequences — convert to real newlines
    const privateKey = sa.private_key?.replace(/\\n/g, '\n') || sa.private_key
    if (!admin?.credential?.cert) {
      throw new Error(
        'firebase-admin credential.cert is undefined. Got keys: ' +
          Object.keys(admin || {}).join(',')
      )
    }
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        privateKey,
        clientEmail: sa.client_email,
      }),
      projectId: sa.project_id,
      storageBucket: sa.project_id + '.firebasestorage.app',
    })
    return adminApp
  } catch (e) {
    initError = `Failed to init Firebase Admin: ${(e as Error).message}`
    console.error(initError)
    return null
  }
}

export function getAdmin() {
  return init()
}

export function isAdminAvailable(): boolean {
  return init() !== null
}

export function getAdminInitError(): string | null {
  // Force init attempt if not yet tried
  init()
  return initError
}

/**
 * Verify a Firebase ID token sent from the client.
 * Returns the decoded token (uid, email, name, picture) or null.
 */
export async function verifyIdToken(idToken: string) {
  const app = init()
  if (!app) return null
  try {
    const decoded = await app.auth().verifyIdToken(idToken)
    return decoded
  } catch (e) {
    console.error('verifyIdToken failed:', (e as Error).message)
    return null
  }
}

/**
 * Look up a user by email in Firebase Auth (creates if missing).
 * Returns the Firebase user record.
 */
export async function getOrCreateUserByEmail(email: string, displayName?: string) {
  const app = init()
  if (!app) return null
  try {
    const user = await app.auth().getUserByEmail(email).catch(async () => {
      // Create if missing
      return await app.auth().createUser({
        email,
        displayName: displayName || email.split('@')[0],
        emailVerified: true,
      })
    })
    return user
  } catch (e) {
    console.error('getOrCreateUserByEmail failed:', (e as Error).message)
    return null
  }
}

/**
 * Mint a Firebase custom token for a given uid.
 * The client can sign in with signInWithCustomToken(auth, token).
 */
export async function createCustomToken(uid: string, claims?: Record<string, unknown>) {
  const app = init()
  if (!app) return null
  try {
    return await app.auth().createCustomToken(uid, claims)
  } catch (e) {
    console.error('createCustomToken failed:', (e as Error).message)
    return null
  }
}
