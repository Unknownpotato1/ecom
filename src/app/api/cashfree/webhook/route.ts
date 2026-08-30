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
 * SECURITY: The webhook is verified using Cashfree's signature scheme.
   Cashfree sends two headers:
     - x-webhook-signature: base64-encoded HMAC-SHA256 signature
     - x-webhook-timestamp: Unix timestamp of when the webhook was sent
   The signature is computed as:
     base64(HMAC-SHA256(rawBody + timestamp, CASHFREE_WEBHOOK_SECRET))
   If the signature doesn't match, the request is rejected (401).
 *
 * WHAT THIS DOES:
 *   - Verifies the webhook signature (prevents fake notifications)
 *   - Logs the payment event for debugging
 *   - Currently does NOT create/update store orders — the client-side
 *     verify flow handles order creation after payment. This webhook
 *     is a backup safety net: if the client crashes after payment,
 *     you'll still see the webhook event in the logs and can manually
 *     reconcile. A future enhancement could auto-create orders from
 *     webhooks, but that requires storing pre-payment order data
 *     (customer info, cart items) which is a bigger architectural change.
 *
 * Env var: CASHFREE_WEBHOOK_SECRET (from Cashfree dashboard → Webhooks)
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('CASHFREE_WEBHOOK_SECRET not configured — cannot verify webhook')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  try {
    // Get the raw body as text (needed for signature verification)
    const rawBody = await req.text()
    const signature = req.headers.get('x-webhook-signature') || ''
    const timestamp = req.headers.get('x-webhook-timestamp') || ''

    if (!signature || !timestamp) {
      console.error('Missing webhook signature/timestamp headers')
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
    }

    // Verify the signature:
    // Cashfree computes: base64(HMAC-SHA256(rawBody + timestamp, webhook_secret))
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody + timestamp)
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
