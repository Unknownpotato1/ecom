import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ADMIN_EMAIL } from '@/lib/auth-store'

// POST /api/auth - record a user sign-in (mock firebase flow)
// Body: { email, name?, image? }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, name, image } = body as { email: string; name?: string; image?: string }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer'

  const user = await db.user.upsert({
    where: { email },
    update: { name: name ?? null, image: image ?? null, role },
    create: { email, name: name ?? null, image: image ?? null, role },
  })

  return NextResponse.json({ user, isAdmin: role === 'admin' })
}
