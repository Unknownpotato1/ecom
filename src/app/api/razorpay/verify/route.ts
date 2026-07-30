import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/razorpay/verify
 * Verifies the Razorpay payment signature after the client completes payment.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns: { verified: true } or { verified: false, error }
 *
 * The signature is HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
export async function POST(req: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keySecret) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
  }

  try {
    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature === razorpay_signature) {
      return NextResponse.json({ verified: true, paymentId: razorpay_payment_id })
    } else {
      console.error('Razorpay signature mismatch')
      return NextResponse.json({ verified: false, error: 'Signature mismatch' }, { status: 400 })
    }
  } catch (e) {
    console.error('Razorpay verify error:', (e as Error).message)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
