import { NextRequest, NextResponse } from 'next/server'
import { listOrders, createOrder, markOrderNotified } from '@/lib/firestore'
import { sendTelegramNotification } from '@/lib/telegram'
import { trackPurchaseServer } from '@/lib/meta-capi'

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

    // ── Send Meta Conversions API (CAPI) Purchase event ──────────
    // Server-side Purchase event for Meta, with the SAME event_id
    // (orderNumber) as the browser pixel → Meta deduplicates browser
    // + server into ONE event (preferring the server event for higher
    // fidelity). This recovers the 30-60% of events lost to ad-blockers,
    // Safari ITP, and Chrome tracking protection. Uses waitUntil so it
    // doesn't block the order response. trackPurchaseServer never
    // throws — all errors are caught and logged internally.
    //
    // ENV: Requires META_CAPI_TOKEN (server-only). When unset, the
    // function silently skips (no error). META_TEST_EVENT_CODE routes
    // the event to Meta's Test Events tab when set.
    const origin = new URL(req.url).origin
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null
    const userAgent = req.headers.get('user-agent') || null

    const capiPromise = trackPurchaseServer(
      {
        total: order.total,
        orderId: order.orderNumber,
        numItems: order.items.reduce(
          (a: number, i: { quantity: number }) => a + i.quantity,
          0
        ),
        contentIds: order.items
          .map((i: { productId?: string | null }) => i.productId)
          .filter(Boolean) as string[],
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
      },
      origin,
      clientIp,
      userAgent
    )

    // Fire-and-forget via waitUntil (same pattern as Telegram above).
    // If waitUntil isn't available, we still fire the promise without
    // awaiting — CAPI is non-critical (best-effort) and should never
    // delay the customer's order confirmation response.
    if (waitUntil) {
      waitUntil(capiPromise)
    }

    return NextResponse.json({ order })
  } catch (e) {
    console.error('POST /api/orders failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
