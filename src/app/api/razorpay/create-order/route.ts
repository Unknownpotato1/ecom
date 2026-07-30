import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/razorpay/create-order
 * Creates a Razorpay order on the server using the secret key.
 * Returns { orderId, amount, currency } to the client.
 *
 * The client uses the orderId to open the Razorpay checkout modal.
 */
export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { amount, currency = 'INR' } = body

  if (!amount || amount < 100) {
    return NextResponse.json({ error: 'Amount must be at least ₹1 (100 paise)' }, { status: 400 })
  }

  try {
    // Razorpay expects amount in paise (₹1 = 100 paise)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // convert rupees to paise
        currency,
        receipt: 'aurora_' + Date.now(),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Razorpay order creation failed:', data)
      return NextResponse.json({ error: data.error?.description || 'Failed to create order' }, { status: 400 })
    }

    return NextResponse.json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
    })
  } catch (e) {
    console.error('Razorpay create-order error:', (e as Error).message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
