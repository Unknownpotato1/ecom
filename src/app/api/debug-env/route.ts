import { NextResponse } from 'next/server'
import { isAdminAvailable, getAdminInitError } from '@/lib/firebase-admin'
import { isDbAvailable } from '@/lib/firestore'

/**
 * GET /api/debug-env
 * Returns boolean status of each required env var (never the values).
 * Use this to diagnose why Firebase Auth, Firestore, or Cloudinary isn't working on Vercel.
 */
export async function GET() {
  return NextResponse.json({
    firebase: {
      serviceAccountSet: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
      serviceAccountValidJson:
        (() => {
          const raw = process.env.FIREBASE_SERVICE_ACCOUNT
          if (!raw) return false
          try {
            const parsed = JSON.parse(raw)
            return !!(parsed.project_id && parsed.private_key && parsed.client_email)
          } catch {
            return false
          }
        })(),
      adminSdkAvailable: isAdminAvailable(),
      adminSdkInitError: getAdminInitError(),
      clientApiKeySet: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      clientProjectIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientAppIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    firestore: {
      available: isDbAvailable(),
    },
    cloudinary: {
      cloudNameSet: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKeySet: !!process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET,
    },
    database: {
      // Legacy — we now use Firestore, but keep for backwards compat
      urlSet: !!process.env.DATABASE_URL,
      note: 'Using Firestore as primary database. DATABASE_URL is no longer required.',
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  })
}
