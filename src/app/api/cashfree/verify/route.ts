import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/cashfree/verify
 *
 * Checks the payment status of a Cashfree order by calling the Cashfree
 * API directly. This is the client-side verification (called after the
 * Cashfree checkout modal closes).
 *
 * Body: { orderId } — the Cashfree order_id (e.g. "eviola_12345_6789")
 * Returns: { verified, paymentStatus, orderStatus }
 *
 * Env vars: same as create-order (CASHFREE_APP_ID, CASHFREE_SECRET_KEY,
 * CASHFREE_ENVIRONMENT).
 */
export async function POST(req: NextRequest) {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const environment = process.env.CASHFREE_ENVIRONMENT || 'sandbox'

  if (!appId || !secretKey) {
    return NextResponse.json({ error: 'Cashfree not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { orderId } = body

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const apiBase = environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'

  try {
    // Fetch the order status from Cashfree
    const res = await fetch(`${apiBase}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Cashfree verify failed:', data)
      return NextResponse.json(
        { verified: false, error: data.message || 'Verification failed' },
        { status: 400 }
      )
    }

    // Cashfree order_status values: ACTIVE, PAID, EXPIRED, etc.
    // "PAID" means the payment was successful.
    const orderStatus = data.order_status
    const verified = orderStatus === 'PAID'

    return NextResponse.json({
      verified,
      paymentStatus: verified ? 'SUCCESS' : 'PENDING',
      orderStatus,
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      orderAmount: data.order_amount,
    })
  } catch (e) {
    console.error('Cashfree verify error:', (e as Error).message)
    return NextResponse.json({ verified: false, error: 'Server error' }, { status: 500 })
  }
}
