/**
 * Meta Pixel integration utilities.
 * Pixel ID: 2535004566926502
 *
 * All functions are no-ops if the Pixel script hasn't loaded yet
 * (e.g. during SSR or ad-block). This makes them safe to call
 * from any React component without guards.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

const PIXEL_ID = '2535004566926502'

let initialized = false

/**
 * Injects the Meta Pixel base code into <head>.
 * Called once from layout.tsx via next/script afterInteractive.
 * Safe to call multiple times — only initializes once.
 */
export function initMetaPixel() {
  if (initialized) return
  if (typeof window === 'undefined') return
  if (window.fbq) {
    initialized = true
    return
  }

  /* eslint-disable */
  !(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
  initialized = true
}

/**
 * Fire a standard Meta Pixel event.
 * No-op if fbq isn't loaded (ad-block, SSR, etc.)
 *
 * event_id (optional): Meta uses this for deduplication — if the same
 * event_id is received twice, Meta keeps only the first. We pass the
 * order number as event_id for Purchase events so a page refresh or
 * double-fire doesn't create duplicate Purchase records in Meta.
 */
function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return
  if (eventId) {
    // With event_id for deduplication (used by Purchase)
    window.fbq('track', event, params, { eventID: eventId })
  } else {
    window.fbq('track', event, params)
  }
}

/** PageView — fired automatically on init and on SPA view changes */
export function trackPageView() {
  track('PageView')
}

/** ViewContent — when a product detail page is viewed */
export function trackViewContent(product: {
  id: string
  title: string
  price: number
  category?: string | null
  currency?: string
}) {
  track('ViewContent', {
    content_ids: [product.id],
    content_name: product.title,
    content_type: 'product',
    value: product.price,
    currency: product.currency || 'INR',
    ...(product.category ? { content_category: product.category } : {}),
  })
}

/** AddToCart — when a product is added to the cart */
export function trackAddToCart(item: {
  id: string
  title: string
  price: number
  quantity: number
  currency?: string
}) {
  track('AddToCart', {
    content_ids: [item.id],
    content_name: item.title,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: item.currency || 'INR',
  })
}

/** InitiateCheckout — when the checkout page is opened */
export function trackInitiateCheckout(cart: {
  total: number
  numItems: number
  currency?: string
}) {
  track('InitiateCheckout', {
    value: cart.total,
    num_items: cart.numItems,
    currency: cart.currency || 'INR',
  })
}

/**
 * Purchase — only after order is successfully completed and verified.
 * Fires fbq('track', 'Purchase') with standard Meta parameters.
 *
 * DEDUPLICATION: Meta Pixel has built-in deduplication via event_id.
 * We use the order number as the event_id so that if the same order
 * somehow fires twice (e.g. a page refresh re-triggers), Meta's
 * deduplication automatically drops the duplicate. This ensures
 * Purchase fires exactly once per order.
 *
 * VALUE COERCION (Fix #1): Meta requires `value` to be a NUMBER.
 * Firestore may return `total` as a string in some edge cases
 * (despite createOrder casting via Number()), which causes Meta
 * Events Manager to flag the event as "missing/invalid value"
 * (0% match rate). We coerce here as a safety net: Number(total),
 * and if the result is NaN/negative/Infinity, we SKIP the browser
 * event entirely — the server-side CAPI event (same event_id) will
 * handle the attribution. Sending an invalid value pollutes Events
 * Manager worse than not sending at all.
 *
 * TEST EVENT CODE: When NEXT_PUBLIC_META_TEST_EVENT_CODE is set in
 * the environment, the event is sent to Meta's Test Events pipeline
 * (Events Manager → Test Events tab) instead of normal production
 * data. This lets you validate value/currency/event_id in Meta
 * before going live. Leave unset in production.
 *
 * Parameters sent:
 *   value        — total order amount (coerced to Number, see above)
 *   currency    — 'INR' (or override via order.currency)
 *   content_type — 'product'
 *   content_ids  — array of product IDs in the order
 *   num_items    — total quantity of items
 *   order_id     — the order number (for reconciliation in Meta dashboard)
 *   event_id     — the order number (for deduplication)
 */
export function trackPurchase(order: {
  total: number
  orderId: string
  numItems: number
  contentIds?: string[]
  currency?: string
}) {
  // Coerce total to a finite non-negative number. If total arrives as
  // a string (e.g. "1167" from Firestore) Number("1167") = 1167 ✓.
  // If it's already a number, Number(1167) = 1167 (no-op) ✓.
  // If it's NaN/negative/Infinity, SKIP the event entirely — sending
  // an invalid value to Meta pollutes Events Manager with 0% match
  // rate events. Better to drop the browser event and let the server-
  // side CAPI event (which has the same event_id) handle it.
  const rawTotal = Number(order.total)
  if (typeof rawTotal !== 'number' || !isFinite(rawTotal) || rawTotal < 0) {
    return
  }

  const currency = (order.currency || 'INR').toUpperCase()

  const params: Record<string, unknown> = {
    value: rawTotal,
    currency,
    content_type: 'product',
    content_ids: order.contentIds || [],
    num_items: order.numItems,
    order_id: order.orderId,
  }

  // Test Events code — only attached when the env var is set, so
  // production events are NOT polluted with test data.
  const testEventCode = process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE
  if (testEventCode) {
    params.test_event_code = testEventCode
  }

  track('Purchase', params, order.orderId) // event_id = orderId, for Meta's deduplication
}
