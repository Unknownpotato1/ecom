import { NextRequest, NextResponse } from 'next/server'
import { listOrders, createOrder } from '@/lib/firestore'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') || undefined
  try {
    const orders = await listOrders(email)
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('GET /api/orders failed:', (e as Error).message)
    return NextResponse.json({ orders: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    items,
    subtotal,
    shipping,
    total,
    paymentMethod,
    notes,
    userId,
  } = body

  if (!customerName || !customerEmail || !customerPhone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const order = await createOrder({
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      subtotal: Number(subtotal),
      shipping: Number(shipping ?? 0),
      total: Number(total),
      paymentMethod,
      notes,
      userId,
    })
    return NextResponse.json({ order })
  } catch (e) {
    console.error('POST /api/orders failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
