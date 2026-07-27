import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ADMIN_EMAIL } from '@/lib/auth-store'
import { verifyIdToken, getOrCreateUserByEmail, createCustomToken, isAdminAvailable } from '@/lib/firebase-admin'

/**
 * POST /api/auth
 * Two modes:
 *   1. { idToken: string } — verify a Firebase ID token from the client (real Google Sign-In flow)
 *   2. { email, name? } — demo / custom-token flow:
 *        a. If Firebase Admin available: mint a custom token for the client to sign in with
 *        b. Always upsert user record in our DB (role = admin if email matches ADMIN_EMAIL)
 *
 * Returns: { user, isAdmin, customToken? }
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

  // Mode 1: verify Firebase ID token
  if (idToken && isAdminAvailable()) {
    const decoded = await verifyIdToken(idToken)
    if (decoded) {
      verifiedEmail = decoded.email
      verifiedName = decoded.name
      verifiedImage = decoded.picture
    } else {
      return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 })
    }
  }

  // Mode 2: demo / custom-token flow using email
  if (!verifiedEmail && email) {
    verifiedEmail = email
    verifiedName = name
    verifiedImage = image

    // If Firebase Admin is available, try to mint a custom token
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
    return NextResponse.json({ error: 'email or idToken required' }, { status: 400 })
  }

  const role = verifiedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer'

  // Upsert in our DB
  const user = await db.user.upsert({
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

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
    isAdmin: role === 'admin',
    customToken,
  })
}
