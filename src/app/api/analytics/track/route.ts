import { NextRequest, NextResponse } from 'next/server'
import { recordVisit } from '@/lib/firestore'

/**
 * POST /api/analytics/track
 *
 * Records a visit. Called silently from the client on page load.
 * The visitorId is generated client-side using localStorage (a random
 * string stored per browser). This lets us distinguish new vs returning
 * visitors without cookies or login.
 *
 * Performance: Two Firestore reads + two writes per visit. Negligible.
 * Errors are swallowed — never break the visitor's experience.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { visitorId } = body

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    await recordVisit(visitorId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    // Silently fail — don't break the visitor's experience
    console.error('Analytics track error:', (e as Error).message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
