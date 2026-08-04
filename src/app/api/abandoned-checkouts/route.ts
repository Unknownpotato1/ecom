import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/abandoned-checkouts
 * Returns all abandoned checkout records (sorted by most recent first).
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/firestore')
    const database = db()
    if (!database) return NextResponse.json({ checkouts: [] })

    const snap = await database.collection('abandonedCheckouts')
      .orderBy('updatedAt', 'desc')
      .get()

    const checkouts = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        customerEmail: data.customerEmail || '',
        shippingAddress: data.shippingAddress || {},
        items: data.items || [],
        subtotal: data.subtotal || 0,
        total: data.total || 0,
        paymentMethodViewed: data.paymentMethodViewed || '',
        convertedToOrder: data.convertedToOrder || false,
        createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
      }
    })

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

    const { db } = await import('@/lib/firestore')
    const database = db()
    if (!database) return NextResponse.json({ error: 'Database not available' }, { status: 500 })

    const now = new Date()
    const docData = {
      sessionKey,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      shippingAddress: shippingAddress || {},
      items: items || [],
      subtotal: Number(subtotal) || 0,
      total: Number(total) || 0,
      paymentMethodViewed: paymentMethodViewed || '',
      convertedToOrder: false,
      updatedAt: now,
    }

    // Check if a record with this sessionKey already exists
    const existing = await database.collection('abandonedCheckouts')
      .where('sessionKey', '==', sessionKey)
      .limit(1)
      .get()

    if (!existing.empty) {
      // Update existing record
      const docId = existing.docs[0].id
      await database.collection('abandonedCheckouts').doc(docId).update({
        ...docData,
        // Keep original createdAt
        createdAt: existing.docs[0].data().createdAt || now,
      })
      return NextResponse.json({ ok: true, id: docId, action: 'updated' })
    } else {
      // Create new record
      docData.createdAt = now
      const ref = await database.collection('abandonedCheckouts').add(docData)
      return NextResponse.json({ ok: true, id: ref.id, action: 'created' })
    }
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

    const { db } = await import('@/lib/firestore')
    const database = db()
    if (!database) return NextResponse.json({ error: 'Database not available' }, { status: 500 })

    await database.collection('abandonedCheckouts').doc(id).delete()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/abandoned-checkouts failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
