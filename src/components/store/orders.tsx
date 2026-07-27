'use client'

import { useEffect, useState } from 'react'
import { Package, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui-store'
import { useAuth } from '@/lib/auth-store'
import { formatPrice, type Order } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function Orders() {
  const { user } = useAuth()
  const { goHome } = useUI()
  const initialEmail = user?.email || null
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(!!initialEmail)
  const [lookupEmail, setLookupEmail] = useState(user?.email || '')
  const [queriedEmail, setQueriedEmail] = useState<string | null>(initialEmail)

  useEffect(() => {
    if (!queriedEmail) return
    let active = true
    fetch(`/api/orders?email=${encodeURIComponent(queriedEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setOrders(data.orders || [])
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [queriedEmail])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 fade-up">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">My Orders</span>
      </nav>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {!user && (
        <div className="rounded-xl border border-pink-100 p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Track your order by email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 h-10 rounded-md border border-pink-200 px-3 text-sm"
            />
            <Button className="bg-brand text-white hover:bg-brand/90" onClick={() => setQueriedEmail(lookupEmail)}>
              Find orders
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pink-200 rounded-xl">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-2 font-medium">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {queriedEmail ? `We couldn't find any orders for ${queriedEmail}.` : 'Start shopping to place your first order.'}
          </p>
          <Button className="mt-4 bg-brand text-white hover:bg-brand/90" onClick={goHome}>Browse hampers</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-pink-100 overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 bg-brand-soft/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Order</span>
                  <span className="font-semibold text-sm">{o.orderNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</span>
                  <span className={cn('px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[o.orderStatus] || 'bg-muted')}>
                    {o.orderStatus}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-medium bg-brand-soft text-brand-deep uppercase">
                    {o.paymentMethod}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                {o.items.map((it) => (
                  <div key={it.id} className="flex gap-3 items-center">
                    <div className="h-12 w-12 rounded-md bg-pink-50 overflow-hidden shrink-0">
                      {it.image && (
                         
                        <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{it.title}</p>
                      <p className="text-xs text-muted-foreground">Qty {it.quantity} • {formatPrice(it.price)}</p>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-pink-100 flex justify-between text-sm">
                <span className="text-muted-foreground">Total ({o.items.length} item{o.items.length === 1 ? '' : 's'})</span>
                <span className="font-semibold">{formatPrice(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
