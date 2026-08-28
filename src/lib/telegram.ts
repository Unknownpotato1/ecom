import type { OrderDoc } from '@/lib/firestore'

/**
 * Telegram notification helper.
 *
 * Sends order notifications to the admin's Telegram chat via the Telegram
 * Bot API. Used by:
 *   1. /api/orders POST — sends immediately when an order is created
 *      (primary mechanism, no cron job needed)
 *   2. /api/notifications/check-new-orders — backup cron endpoint that
 *      catches any orders the immediate send missed (e.g. if Telegram
 *      API was temporarily down during order creation)
 *
 * Env vars (set on Vercel):
 *   - TELEGRAM_BOT_TOKEN: the bot token from @BotFather
 *   - TELEGRAM_CHAT_ID: the admin's Telegram chat ID
 */

// Format a number as Indian Rupees (₹XXX)
function formatPrice(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// Escape special HTML characters for Telegram's HTML parse mode
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Build the rich Telegram message HTML for a single order.
 * Includes: order number, customer details, items, address, payment
 * method + breakdown, promo code, notes, timestamp.
 */
export function buildOrderMessage(order: OrderDoc): string {
  // Parse the shipping address JSON
  let addr: Record<string, string> = {}
  try {
    addr = JSON.parse(order.shippingAddress)
  } catch {
    addr = {}
  }

  const isCod = order.paymentMethod === 'cod'
  const paymentLabel = isCod ? 'Cash on Delivery' : 'Prepaid (Online)'
  const paymentIcon = isCod ? '💵' : '💳'

  // Items list
  const itemsHtml = order.items
    .map((it) => {
      const lineTotal = it.price * it.quantity
      return `  • ${escapeHtml(it.title)} × ${it.quantity} — ${formatPrice(lineTotal)}`
    })
    .join('\n')

  // Address block
  const addressLines = [
    addr.line1,
    addr.line2,
    [addr.city, addr.state].filter(Boolean).join(', '),
    addr.pincode,
  ]
    .filter(Boolean)
    .join('\n  ')

  // Promo code line (only if a promo was used)
  const promoLine = order.discountCode
    ? `\n🎟 <b>Promo:</b> ${escapeHtml(order.discountCode)} (−${formatPrice(order.discountAmount || 0)})`
    : ''

  // COD breakdown: how much paid now vs due on delivery
  let paymentBreakdown = ''
  if (isCod) {
    const partialPaid = order.paymentStatus === 'partial_paid'
    if (partialPaid) {
      const codPartial = order.total <= 2 ? order.total : 49
      const remaining = Math.max(0, order.total - codPartial)
      paymentBreakdown = `\n  └ Paid now: ${formatPrice(codPartial)}\n  └ Pay on delivery: ${formatPrice(remaining)}`
    } else {
      paymentBreakdown = `\n  └ Pay on delivery: ${formatPrice(order.total)}`
    }
  } else {
    paymentBreakdown = `\n  └ Paid: ${formatPrice(order.total)}`
  }

  // Notes (if any)
  const notesLine = order.notes
    ? `\n📝 <b>Notes:</b> ${escapeHtml(order.notes)}`
    : ''

  return `
🛍 <b>NEW ORDER</b> — ${escapeHtml(order.orderNumber)}

👤 <b>Customer</b>
  ${escapeHtml(order.customerName)}
  📞 ${escapeHtml(order.customerPhone)}
${order.customerEmail ? `  ✉️ ${escapeHtml(order.customerEmail)}` : ''}

📦 <b>Items</b>
${itemsHtml}

📍 <b>Address</b>
  ${addressLines || 'N/A'}

${paymentIcon} <b>Payment: ${paymentLabel}</b>${paymentBreakdown}

💰 <b>Summary</b>
  Subtotal: ${formatPrice(order.subtotal)}
  Shipping: ${order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}
  Total: ${formatPrice(order.total)}${promoLine}${notesLine}

🕐 ${new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
  `.trim()
}

/**
 * Send a Telegram message to the admin's chat.
 * Returns true on success, false on failure.
 * Failures are logged but don't throw — the caller should not break
 * if Telegram is temporarily unavailable.
 */
export async function sendTelegramNotification(order: OrderDoc): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  // If credentials aren't configured, silently skip (don't break order creation)
  if (!botToken || !chatId) {
    console.log('Telegram credentials not configured — skipping notification')
    return false
  }

  try {
    const message = buildOrderMessage(order)
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Telegram send failed:', res.status, errText)
      return false
    }

    return true
  } catch (e) {
    console.error('Telegram send error:', (e as Error).message)
    return false
  }
}
