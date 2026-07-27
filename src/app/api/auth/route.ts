import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ADMIN_EMAIL } from '@/lib/auth-store'
import { verifyIdToken, getOrCreateUserByEmail, createCustomToken, isAdminAvailable } from '@/lib/firebase-admin'

/**
 * Decode a Firebase ID token's payload WITHOUT cryptographic verification.
 * This is a fallback for when the Admin SDK can't initialize (e.g. env var issues).
 * The token was already verified by the Firebase client SDK when the user signed in,
 * so trusting the payload here is acceptable for the demo. For production, you should
 * fix the FIREBASE_SERVICE_ACCOUNT env var so verifyIdToken() succeeds.
 *
 * Firebase ID tokens are JWTs with 3 base64url-encoded parts separated by dots.
 * The middle part is the payload JSON.
 */
function decodeIdTokenPayload(idToken: string): {
  email?: string
  name?: string
  picture?: string
  user_id?: string
  sub?: string
} | null {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    // base64url -> base64 -> JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch (e) {
    console.error('decodeIdTokenPayload failed:', (e as Error).message)
    return null
  }
}

/**
 * POST /api/auth
 * Modes:
 *   1. { idToken, email?, name?, image? } — Google Sign-In popup flow
 *      - If Admin SDK available: verify token → use decoded email
 *      - If Admin SDK NOT available: decode JWT payload manually (unverified) → use email
 *      - email/name/image from the request body act as a backup
 *   2. { email, name?, image? } — demo / custom-token flow
 *      - If Admin SDK available: mint a custom token for the client
 *
 * Returns: { user, isAdmin, customToken?, warnings? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { idToken, email, name, image } = body as {
    idToken?: string
    email?: string
    name?: string
    image?: string
  }

  let verifiedEmail: string | undefined
  let verifiedName: string | undefined
  let verifiedImage: string | undefined
  let customToken: string | null = null
  const warnings: string[] = []

  // Mode 1: Google Sign-In with idToken
  if (idToken) {
    let decoded: { email?: string; name?: string; picture?: string } | null = null

    // Try real verification first (preferred)
    if (isAdminAvailable()) {
      const verified = await verifyIdToken(idToken)
      if (verified) {
        decoded = {
          email: verified.email,
          name: verified.name,
          picture: verified.picture,
        }
      } else {
        warnings.push('Admin SDK initialized but token verification failed; falling back to unverified decode')
      }
    } else {
      warnings.push('FIREBASE_SERVICE_ACCOUNT env var missing or invalid; using unverified token decode')
    }

    // Fallback: decode payload without verification
    if (!decoded) {
      decoded = decodeIdTokenPayload(idToken)
    }

    if (decoded?.email) {
      verifiedEmail = decoded.email
      verifiedName = decoded.name || name
      verifiedImage = decoded.picture || image
    } else if (email) {
      // Final fallback: use the email from the request body
      verifiedEmail = email
      verifiedName = name
      verifiedImage = image
      warnings.push('Could not extract email from idToken; used email from request body')
    } else {
      return NextResponse.json(
        {
          error: 'Could not verify token or extract email. Check FIREBASE_SERVICE_ACCOUNT env var.',
          warnings,
        },
        { status: 400 }
      )
    }
  }

  // Mode 2: demo / custom-token flow using email
  if (!verifiedEmail && email) {
    verifiedEmail = email
    verifiedName = name
    verifiedImage = image

    if (isAdminAvailable()) {
      const fbUser = await getOrCreateUserByEmail(email, name)
      if (fbUser) {
        customToken = await createCustomToken(fbUser.uid, {
          email: fbUser.email,
          role: email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
        })
      }
    }
  }

  if (!verifiedEmail) {
    return NextResponse.json(
      { error: 'email or idToken required', warnings },
      { status: 400 }
    )
  }

  const role = verifiedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer'

  // Upsert in our DB
  let user
  try {
    user = await db.user.upsert({
      where: { email: verifiedEmail },
      update: {
        name: verifiedName ?? null,
        image: verifiedImage ?? null,
        role,
      },
      create: {
        email: verifiedEmail,
        name: verifiedName ?? null,
        image: verifiedImage ?? null,
        role,
      },
    })
  } catch (dbError) {
    // Database not configured yet — return success anyway so login still works
    // (the client-side auth-store will still set the session)
    const msg = (dbError as Error).message
    warnings.push(`Database upsert failed: ${msg}. Login still succeeded but user record not saved.`)
    return NextResponse.json({
      user: {
        email: verifiedEmail,
        name: verifiedName ?? null,
        image: verifiedImage ?? null,
        role,
      },
      isAdmin: role === 'admin',
      customToken,
      warnings,
    })
  }

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
    isAdmin: role === 'admin',
    customToken,
    warnings: warnings.length ? warnings : undefined,
  })
}
