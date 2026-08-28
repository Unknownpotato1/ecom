import { NextResponse } from 'next/server'
import {
  listOrders,
  getNotifiedOrderIds,
  markOrderNotified,
  type OrderDoc,
} from '@/lib/firestore'

/**
 * Telegram order notification endpoint.
 *
 * Called by a Vercel Cron job every 60 seconds. Checks for orders that
 * haven't been notified yet (tracked via the `telegramNotifications`
 * Firestore collection) and sends a rich Telegram message for each one
 * to the admin's chat ID.
 *
 * Security: this endpoint is secured by a CRON_SECRET query parameter
 * that matches the TELEGRAM_CRON_SECRET env var. Without the correct
 * secret, the endpoint returns 401. This prevents anyone from calling
 * it manually and spamming the admin's Telegram.
 *
 * Env vars required:
 *   - TELEGRAM_BOT_TOKEN: the bot token from @BotFather
 *   - TELEGRAM_CHAT_ID: the admin's Telegram chat ID
 *   - TELEGRAM_CRON_SECRET: a random secret string that must match the
 *     ?secret= query param (set by the Vercel Cron job)
 */

// Format a number as Indian Rupees (₹XXX)
function formatPrice(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// Escape special HTML characters so Telegram's HTML parse mode doesn't break
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Build the Telegram message HTML for a single order
function buildOrderMessage(order: OrderDoc): string {
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
  // For COD: paymentStatus 'partial_paid' means ₹49 (or ₹2 for FS2) was paid
  // online as confirmation, and the rest is due on delivery.
  // For prepaid: full amount paid.
  let paymentBreakdown = ''
  if (isCod) {
    const partialPaid = order.paymentStatus === 'partial_paid'
    if (partialPaid) {
      // Total - 49 = remaining (or total - 2 for FS2). We compute from the
      // stored total. If total is 2 (FS2), remaining is 0.
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

// Send a message via the Telegram Bot API
async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
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
}

export async function GET(req: Request) {
  // Auth check: the ?secret= query param must match TELEGRAM_CRON_SECRET
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const expectedSecret = process.env.TELEGRAM_CRON_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 500 })
  }

  try {
    // Fetch all orders (we'll filter for un-notified ones)
    const allOrders = await listOrders()

    // Fetch the set of order IDs that have already been notified
    const notifiedIds = await getNotifiedOrderIds()

    // Find orders that haven't been notified yet.
    // Sort oldest-first so notifications go out in order (in case multiple
    // new orders arrived between cron ticks).
    const newOrders = allOrders
      .filter((o) => !notifiedIds.has(o.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (newOrders.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No new orders' })
    }

    // Send a Telegram message for each new order, then mark it as notified.
    let sentCount = 0
    for (const order of newOrders) {
      const message = buildOrderMessage(order)
      const success = await sendTelegramMessage(botToken, chatId, message)
      if (success) {
        await markOrderNotified({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
        })
        sentCount++
      }
      // Small delay between messages to avoid hitting Telegram rate limits
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({
      notified: sentCount,
      total: newOrders.length,
      message: `Sent ${sentCount} of ${newOrders.length} notifications`,
    })
  } catch (e) {
    console.error('Telegram notification check failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
