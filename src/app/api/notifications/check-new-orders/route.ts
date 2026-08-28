import { NextResponse } from 'next/server'
import {
  listOrders,
  getNotifiedOrderIds,
  markOrderNotified,
} from '@/lib/firestore'
import { sendTelegramNotification } from '@/lib/telegram'

/**
 * BACKUP Telegram notification endpoint.
 *
 * This is a FALLBACK — the primary notification mechanism is now the
 * immediate send from /api/orders POST (fires the instant an order is
 * created). This endpoint exists to catch any orders that the immediate
 * send missed (e.g. if the Telegram API was temporarily down when the
 * order was placed).
 *
 * If you set up a free external cron (cron-job.org) to call this endpoint
 * every minute, it acts as a safety net. If you DON'T set up the cron,
 * that's fine — the immediate send handles 99% of cases. This endpoint
 * is just extra insurance.
 *
 * Security: secured by ?secret= query param (TELEGRAM_CRON_SECRET env var).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const expectedSecret = process.env.TELEGRAM_CRON_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allOrders = await listOrders()
    const notifiedIds = await getNotifiedOrderIds()

    const newOrders = allOrders
      .filter((o) => !notifiedIds.has(o.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (newOrders.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No new orders' })
    }

    let sentCount = 0
    for (const order of newOrders) {
      const success = await sendTelegramNotification(order)
      if (success) {
        await markOrderNotified({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
        })
        sentCount++
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({
      notified: sentCount,
      total: newOrders.length,
      message: `Sent ${sentCount} of ${newOrders.length} notifications`,
    })
  } catch (e) {
    console.error('Backup notification check failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
