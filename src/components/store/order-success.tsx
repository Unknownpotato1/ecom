'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Package, MapPin, Truck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui-store'
import type { Order } from '@/lib/types'
import { formatPrice } from '@/lib/types'

export function OrderSuccess() {
  const { goHome, goOrders } = useUI()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('aurora:last-order')
    if (!raw) return
    Promise.resolve()
      .then(() => {
        try {
          setOrder(JSON.parse(raw))
        } catch {
          // ignore
        }
      })
       
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 fade-up">
      <div className="text-center mb-8">
        <div className="h-20 w-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mt-4">Thank you for your order!</h1>
        <p className="text-muted-foreground mt-2">
          We've received your order and our team is preparing your jewelry with love.
        </p>
      </div>

      {order && (
        <div className="rounded-xl border border-pink-100 overflow-hidden">
          <div className="bg-brand-soft px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Order number</p>
              <p className="text-lg font-bold tracking-wide">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-price">{formatPrice(order.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Payment</p>
              <p className="text-sm font-medium uppercase">{order.paymentMethod}</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">Items</h3>
            {order.items.map((it) => (
              <div key={it.id} className="flex gap-3">
                <div className="h-12 w-12 rounded-md bg-pink-50 overflow-hidden shrink-0">
                  {it.image && (
                     
                    <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{it.title}</p>
                  <p className="text-xs text-muted-foreground">Qty {it.quantity} • <span className="text-price">{formatPrice(it.price)}</span></p>
                </div>
                <span className="text-sm font-medium text-price">{formatPrice(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/30 px-5 py-4 grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand" /> Order placed
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" /> Out for delivery
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> Delivered
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 mt-6">
        <Button variant="outline" onClick={goOrders}>View my orders</Button>
        <Button className="bg-brand text-white hover:shadow-lg" onClick={goHome}>
          Continue shopping <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
