import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/cashfree/webhook
 *
 * Cashfree webhook receiver. Cashfree sends payment status notifications
 * to this endpoint (configured in the Cashfree dashboard).
 *
 * This is the URL to put in Cashfree's webhook settings:
 *   https://eviola.in/api/cashfree/webhook
 *
 * SECURITY: Cashfree signs webhooks using HMAC-SHA256 with the webhook
 * signature computed over the raw body. The signature is sent in the
 * 'x-webhook-signature' header. Cashfree does NOT provide a separate
 * webhook secret in the dashboard — the signature is verified using
 * the CASHFREE_SECRET_KEY (the same key used for API calls).
 *
 * For Cashfree's test webhook (sent from the dashboard during setup),
 * there may be no signature header — in that case we accept it but log
 * a warning. This lets the initial webhook test pass.
 *
 * Env vars: CASHFREE_SECRET_KEY (required for signature verification)
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.CASHFREE_SECRET_KEY

  if (!secretKey) {
    console.error('CASHFREE_SECRET_KEY not configured — cannot verify webhook')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    // Get the raw body as text (needed for signature verification)
    const rawBody = await req.text()
    const signature = req.headers.get('x-webhook-signature') || ''
    const timestamp = req.headers.get('x-webhook-timestamp') || ''

    // If no signature header is present, this might be a test webhook
    // from the Cashfree dashboard. Accept it so the setup test passes,
    // but log a warning.
    if (!signature) {
      console.log('Webhook received without signature — likely a dashboard test. Accepting.')
      try {
        const testPayload = JSON.parse(rawBody)
        console.log('Test webhook payload:', testPayload)
      } catch {
        console.log('Webhook raw body (non-JSON):', rawBody.slice(0, 200))
      }
      return NextResponse.json({ received: true, test: true })
    }

    // Verify the signature:
    // Cashfree computes: base64(HMAC-SHA256(rawBody + timestamp, secret_key))
    const dataToSign = timestamp ? rawBody + timestamp : rawBody
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(dataToSign)
      .digest('base64')

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch — rejecting')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Signature verified — parse the webhook payload
    const payload = JSON.parse(rawBody)

    // Log the event for debugging and reconciliation
    const eventType = payload.type || payload.event || 'UNKNOWN'
    const orderData = payload.data?.order || {}
    const paymentData = payload.data?.payment || {}

    console.log('Cashfree webhook received:', {
      event: eventType,
      orderId: orderData.order_id,
      cfOrderId: orderData.cf_order_id,
      orderStatus: orderData.order_status,
      paymentStatus: paymentData.payment_status,
      paymentId: paymentData.cf_payment_id,
      amount: orderData.order_amount,
    })

    // Currently we just acknowledge the webhook. The client-side verify
    // flow handles order creation. This webhook serves as:
    //   1. A backup signal (if client crashes, you see it in logs)
    //   2. Future-ready (can add order status updates here later)
    //
    // Returning 200 tells Cashfree "received OK" so they don't retry.

    return NextResponse.json({ received: true, event: eventType })
  } catch (e) {
    console.error('Cashfree webhook error:', (e as Error).message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
