import { NextRequest, NextResponse } from 'next/server'
import {
  listAbandonedCheckouts,
  createOrUpdateAbandonedCheckout,
  deleteAbandonedCheckout,
} from '@/lib/firestore'

/**
 * GET /api/abandoned-checkouts
 * Returns all abandoned checkout records (sorted by most recent first).
 */
export async function GET() {
  try {
    const checkouts = await listAbandonedCheckouts()
    return NextResponse.json(
      { checkouts },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (e) {
    console.error('GET /api/abandoned-checkouts failed:', (e as Error).message)
    return NextResponse.json({ checkouts: [], error: (e as Error).message }, { status: 500 })
  }
}

/**
 * POST /api/abandoned-checkouts
 * Creates or updates an abandoned checkout record.
 * If a record with the same sessionKey exists, it's updated; otherwise a new one is created.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sessionKey,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
      subtotal,
      total,
      paymentMethodViewed,
    } = body

    if (!sessionKey) {
      return NextResponse.json({ error: 'sessionKey is required' }, { status: 400 })
    }

    const result = await createOrUpdateAbandonedCheckout({
      sessionKey,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      shippingAddress: shippingAddress || {},
      items: items || [],
      subtotal: Number(subtotal) || 0,
      total: Number(total) || 0,
      paymentMethodViewed: paymentMethodViewed || '',
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('POST /api/abandoned-checkouts failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/**
 * DELETE /api/abandoned-checkouts?id=<id>
 * Deletes a single abandoned checkout record by ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await deleteAbandonedCheckout(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/abandoned-checkouts failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
