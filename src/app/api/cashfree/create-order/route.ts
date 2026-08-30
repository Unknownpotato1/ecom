import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/cashfree/create-order
 *
 * Creates a Cashfree payment order. Returns { orderId, paymentSessionId, cfOrderId }
 * to the client. The client uses paymentSessionId to open the Cashfree checkout
 * modal via the Cashfree JS SDK.
 *
 * Env vars:
 *   - CASHFREE_APP_ID: Cashfree app/client ID
 *   - CASHFREE_SECRET_KEY: Cashfree secret key
 *   - CASHFREE_ENVIRONMENT: "sandbox" or "production"
 *
 * Amount is in RUPEES (same as the Razorpay route) — Cashfree accepts
 * decimal rupees directly (no paise conversion needed).
 */
export async function POST(req: NextRequest) {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const environment = process.env.CASHFREE_ENVIRONMENT || 'sandbox'

  if (!appId || !secretKey) {
    return NextResponse.json(
      { error: 'Cashfree not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY env vars.' },
      { status: 500 }
    )
  }

  const body = await req.json()
  const {
    amount,
    currency = 'INR',
    customerName = '',
    customerPhone = '',
    customerEmail = '',
  } = body

  // Amount is in rupees. Cashfree accepts decimal amounts.
  // Minimum is ₹1 (same validation as Razorpay route).
  if (!amount || amount < 1) {
    return NextResponse.json({ error: 'Amount must be at least ₹1' }, { status: 400 })
  }

  // API base URL depends on environment
  const apiBase = environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'

  // Generate a unique order ID for Cashfree
  const orderId = 'eviola_' + Date.now() + '_' + Math.floor(Math.random() * 10000)

  try {
    const res = await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: currency,
        customer_details: {
          customer_id: customerPhone || 'guest_' + Date.now(),
          customer_name: customerName || 'Guest Customer',
          customer_email: customerEmail || 'guest@eviola.in',
          customer_phone: customerPhone || '9999999999',
        },
        order_meta: {
          // Cashfree redirects here after payment (used if redirectTarget
          // is _self instead of _modal). The {order_id} placeholder is
          // replaced by Cashfree with the actual order ID.
          return_url: `https://eviola.in/checkout?cf_order_id={order_id}`,
        },
        order_note: 'Eviola order payment',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Cashfree order creation failed:', data)
      return NextResponse.json(
        { error: data.message || data.error?.type || 'Failed to create Cashfree order' },
        { status: 400 }
      )
    }

    // Cashfree returns: cf_order_id, order_id, payment_session_id, order_status
    return NextResponse.json({
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
      amount: Number(amount),
      currency,
    })
  } catch (e) {
    console.error('Cashfree create-order error:', (e as Error).message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
