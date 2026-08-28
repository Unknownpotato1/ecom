import { NextRequest, NextResponse } from 'next/server'
import { listOrders, createOrder, markOrderNotified } from '@/lib/firestore'
import { sendTelegramNotification } from '@/lib/telegram'

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

  // ⚠️ customerEmail is NOT required.
  // Many customers order as guests (not signed in). When the user isn't
  // authenticated, `user?.email` is undefined and the client sends
  // customerEmail: ''. The previous check `!customerEmail` rejected
  // empty strings, which broke ordering on any new browser/device where
  // the user hadn't signed in — payment succeeded but order creation
  // failed with "Missing required fields".
  //
  // customerEmail is still stored if provided (for signed-in users),
  // but guest orders with no email are now allowed.
  if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
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
      // Forward promo code info so it's stored on the order document
      // (used by the Telegram notification system to show the promo code).
      discountCode: body.discountCode ?? null,
      discountAmount: Number(body.discountAmount) || 0,
    })

    // ── Send Telegram notification IMMEDIATELY ──────────────────────
    // This is the primary notification mechanism — no cron job needed.
    // The notification fires the instant the order is created, so the
    // admin gets it in real-time. If this fails (e.g. Telegram API
    // temporarily down), the backup cron endpoint at
    // /api/notifications/check-new-orders will catch it later.
    //
    // sendTelegramNotification never throws — it catches all errors
    // internally and returns false. So this can never break order creation.
    const notifPromise = sendTelegramNotification(order).then((success) => {
      if (success) {
        // Mark as notified so the backup cron doesn't re-send it
        markOrderNotified({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
        }).catch(() => {})
      }
    })

    // If the platform supports waitUntil (Next.js runtime), use it to let
    // the notification finish after the response is sent — so the customer's
    // browser gets the order confirmation instantly without waiting for
    // Telegram. Otherwise, await inline (acceptable fallback).
    const waitUntil = (req as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil
    if (waitUntil) {
      waitUntil(notifPromise)
    } else {
      await notifPromise
    }

    return NextResponse.json({ order })
  } catch (e) {
    console.error('POST /api/orders failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
