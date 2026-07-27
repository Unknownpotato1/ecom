import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (email) {
    const orders = await db.order.findMany({
      where: { customerEmail: email },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })
    return NextResponse.json({ orders })
  }
  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })
  return NextResponse.json({ orders })
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

  const orderNumber = 'AUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000)

  const order = await db.order.create({
    data: {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: JSON.stringify(shippingAddress),
      subtotal: Number(subtotal),
      shipping: Number(shipping ?? 0),
      total: Number(total),
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      notes: notes ?? null,
      userId: userId ?? null,
      items: {
        create: items.map((it: { productId?: string; title: string; price: number; quantity: number; image?: string }) => ({
          productId: it.productId ?? null,
          title: it.title,
          price: Number(it.price),
          quantity: Number(it.quantity),
          image: it.image ?? null,
        })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json({ order })
}
