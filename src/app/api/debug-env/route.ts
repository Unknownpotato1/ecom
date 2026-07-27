import { NextResponse } from 'next/server'
import { isAdminAvailable, getAdminInitError, getAdmin } from '@/lib/firebase-admin'
import { isDbAvailable, getDbInitError } from '@/lib/firestore'

/**
 * GET /api/debug-env
 * Returns boolean status of each required env var (never the values).
 */
export async function GET() {
  const adminApp = getAdmin() as unknown as Record<string, unknown> | null
  let adminKeys: string[] = []
  if (adminApp) {
    adminKeys = Object.keys(adminApp)
  }

  return NextResponse.json({
    firebase: {
      serviceAccountSet: !!process.env.FIREBASE_SERVICE_ACCOUNT,
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
      adminAppKeys: adminKeys,
      clientApiKeySet: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      clientProjectIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientAppIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    firestore: {
      available: isDbAvailable(),
      initError: getDbInitError(),
    },
    cloudinary: {
      cloudNameSet: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKeySet: !!process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET,
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  })
}
