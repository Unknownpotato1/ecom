/**
 * Meta Conversions API (CAPI) — server-side event sender.
 *
 * Sends Purchase events directly to Meta's Graph API from the server,
 * which complements the browser-side Meta Pixel. When both the browser
 * pixel and the server CAPI send the same event with the same
 * `event_id`, Meta deduplicates them into a single event (preferring
 * the server event for higher fidelity).
 *
 * WHY: Browser pixels are blocked by ad-blockers, Safari ITP, and
 * Chrome tracking protection — typically losing 30-60% of events.
 * CAPI recovers that loss by sending from the server. Meta also
 * gives higher match quality to server-side events because they
 * can include user_data (hashed email/phone + IP + user-agent).
 *
 * ENV VARS (server-only, set on Vercel):
 *   META_CAPI_TOKEN          — Conversions API access token (required)
 *   META_TEST_EVENT_CODE     — Test event code (optional, for Meta's
 *                              Test Events tab; leave unset in production)
 *
 * Pixel ID is hardcoded to match the browser pixel (2535004566926502).
 * Graph API version: v18.0 (stable, widely supported).
 */

import crypto from 'crypto'

const PIXEL_ID = '2535004566926502'
const GRAPH_API_VERSION = 'v18.0'
const CAPI_ENDPOINT = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`

/**
 * SHA-256 hash a string for Meta user_data. Meta requires PII to be
 * hashed (lowercased + trimmed before hashing for email/phone).
 * Returns hex-encoded hash.
 */
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Normalize + hash an email address for Meta user_data.em.
 * Returns null if the email is empty or invalid.
 */
function hashEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return null
  return sha256(normalized)
}

/**
 * Normalize + hash a phone number for Meta user_data.ph.
 * Strips all non-digit characters, keeps the raw digits, hashes.
 * Returns null if the phone is empty.
 */
function hashPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return sha256(digits)
}

/**
 * Send a Purchase event to Meta via the Conversions API.
 *
 * This function NEVER throws — all errors are caught and logged.
 * It's designed to be called via Next.js `waitUntil()` so it runs
 * after the HTTP response is sent without blocking the customer's
 * order confirmation.
 *
 * @param order The order data — must match what the browser pixel sends
 *              (same event_id = orderNumber, same value, same currency)
 *              so Meta can deduplicate browser + server into one event.
 * @param requestOrigin The origin URL of the request (for event_source_url)
 * @param clientIp The customer's IP address (for user_data matching)
 * @param userAgent The customer's browser user-agent (for user_data matching)
 */
export async function trackPurchaseServer(order: {
  total: number
  orderId: string
  numItems: number
  contentIds?: string[]
  currency?: string
  customerEmail?: string | null
  customerPhone?: string | null
}, requestOrigin: string, clientIp: string | null, userAgent: string | null): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN
  if (!token) {
    // No token configured — silently skip. This is expected in
    // development environments where CAPI isn't set up.
    console.warn('[meta-capi] META_CAPI_TOKEN not set — skipping server-side Purchase event')
    return false
  }

  // Coerce value to a finite non-negative number (same logic as the
  // browser pixel). Skip if invalid — never send garbage to Meta.
  const rawTotal = Number(order.total)
  if (typeof rawTotal !== 'number' || !isFinite(rawTotal) || rawTotal < 0) {
    console.warn(`[meta-capi] Invalid order total (${order.total}) for order ${order.orderId} — skipping`)
    return false
  }

  const currency = (order.currency || 'INR').toUpperCase()
  const eventTime = Math.floor(Date.now() / 1000)

  // event_source_url — the page where the event occurred. For a
  // Purchase, this is the checkout page. Meta uses this for
  // attribution and domain verification.
  const eventSourceUrl = `${requestOrigin}/checkout`

  // user_data — Meta uses this for identity matching. We include
  // hashed email + hashed phone (when available) plus the client IP
  // and user-agent (which don't need hashing). These significantly
  // improve match quality vs. browser-only events.
  const userData: Record<string, string> = {}

  const hashedEmail = hashEmail(order.customerEmail)
  if (hashedEmail) userData.em = hashedEmail

  const hashedPhone = hashPhone(order.customerPhone)
  if (hashedPhone) userData.ph = hashedPhone

  if (clientIp) userData.client_ip_address = clientIp
  if (userAgent) userData.client_user_agent = userAgent

  const eventData: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: order.orderId, // SAME event_id as the browser pixel → Meta deduplicates
    action_source: 'website',
    event_source_url: eventSourceUrl,
    user_data: userData,
    custom_data: {
      currency,
      value: rawTotal,
      content_type: 'product',
      content_ids: order.contentIds || [],
      num_items: order.numItems,
      order_id: order.orderId,
    },
  }

  const payload: { data: unknown[]; test_event_code?: string } = {
    data: [eventData],
    // access_token passed as query param, not in body (Meta's
    // recommended approach for security — keeps the token out of
    // request logs that capture the body).
  }

  // Test event code — ONLY attaches at the TOP LEVEL of the payload
  // (NOT inside eventData). Per Meta's Conversions API spec, the
  // test_event_code field is a sibling of `data`, not a property of
  // each event. If placed inside eventData, Meta still receives and
  // processes the event (returns events_received: 1) but does NOT
  // route it to the Test Events tab — which is exactly the bug we
  // hit (orders were received by Meta but not visible for testing).
  // Leave unset in production.
  const testEventCode = process.env.META_TEST_EVENT_CODE
  if (testEventCode) {
    payload.test_event_code = testEventCode
  }

  try {
    const url = `${CAPI_ENDPOINT}?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '<no response body>')
      console.error(`[meta-capi] Graph API returned ${res.status} for order ${order.orderId}:`, errorText)
      return false
    }

    const data = await res.json().catch(() => ({}))
    // Meta returns { events_received: 1, ... } on success. If
    // fbtrace_id is present, log it for Meta support debugging.
    const traceId = (data as { fbtrace_id?: string })?.fbtrace_id
    if (data && typeof data === 'object' && 'events_received' in data) {
      console.log(`[meta-capi] Purchase event sent for order ${order.orderId} (trace: ${traceId || 'n/a'})`)
    }

    return true
  } catch (err) {
    console.error(`[meta-capi] Failed to send Purchase event for order ${order.orderId}:`, err)
    return false
  }
}
