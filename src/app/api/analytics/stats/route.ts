import { NextResponse } from 'next/server'
import { getVisitorStats } from '@/lib/firestore'

/**
 * GET /api/analytics/stats
 *
 * Returns visitor stats for the admin panel:
 * - Lifetime total visits + unique visitors
 * - Today's visits + unique visitors
 * - Last 30 days breakdown (date, visits, unique visitors)
 * - Returning visitors count
 */
export async function GET() {
  try {
    const stats = await getVisitorStats()
    return NextResponse.json(
      { stats },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (e) {
    console.error('GET /api/analytics/stats failed:', (e as Error).message)
    return NextResponse.json({ stats: null, error: (e as Error).message }, { status: 500 })
  }
}
