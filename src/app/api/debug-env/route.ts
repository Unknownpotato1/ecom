import { NextResponse } from 'next/server'
import { isAdminAvailable } from '@/lib/firebase-admin'

/**
 * GET /api/debug-env
 * Returns boolean status of each required env var (never the values).
 * Use this to diagnose why Firebase Auth or Cloudinary isn't working on Vercel.
 */
export async function GET() {
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
      clientApiKeySet: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      clientProjectIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientAppIdSet: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    cloudinary: {
      cloudNameSet: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKeySet: !!process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET,
    },
    database: {
      urlSet: !!process.env.DATABASE_URL,
      urlIsPostgres: (process.env.DATABASE_URL || '').startsWith('postgresql://'),
      urlIsPlaceholder: (process.env.DATABASE_URL || '').includes('placeholder'),
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  })
}
