/**
 * Meta Pixel integration utilities.
 * Pixel ID: 843987037746164
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

const PIXEL_ID = '843987037746164'

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
 */
function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', event, params)
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

/** Purchase — only after order is successfully completed and verified */
export function trackPurchase(order: {
  total: number
  orderId: string
  numItems: number
  currency?: string
}) {
  track('Purchase', {
    value: order.total,
    currency: order.currency || 'INR',
    content_type: 'product',
    num_items: order.numItems,
    order_id: order.orderId,
  })
}
