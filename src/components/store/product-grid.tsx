'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  filter: 'all' | 'best' | 'trending' | 'festive' | 'birthday' | 'anniversary'
  anchorId?: string
  listenToFilterEvents?: boolean
  /**
   * Optional React nodes to render INSIDE the product grid, after the
   * Nth product. Used to inject custom sections (e.g. a video banner)
   * between products on the home page.
   *
   * The inserted content spans the full grid width (lg:col-span-4 on
   * desktop, col-span-2 on mobile) so it breaks the grid row cleanly.
   *
   * Pass undefined or null to render nothing (normal behavior).
   */
  insertAfterN?: number | null
  insertContent?: ReactNode
}

export function ProductGrid({ title, filter, anchorId, listenToFilterEvents, insertAfterN, insertContent }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [overrideFilter, setOverrideFilter] = useState<string | null>(null)
  const { searchQuery } = useUI()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listenToFilterEvents) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail && detail !== 'all') {
        setOverrideFilter(detail)
        ref.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        setOverrideFilter(null)
      }
    }
    window.addEventListener('aurora:filter', handler)
    return () => window.removeEventListener('aurora:filter', handler)
  }, [listenToFilterEvents])

  useEffect(() => {
    let active = true
    const q = new URLSearchParams()
    const activeFilter = overrideFilter ?? filter
    if (activeFilter === 'best') q.set('best', '1')
    else if (activeFilter === 'trending') q.set('trending', '1')
    else if (['festive', 'birthday', 'anniversary'].includes(activeFilter)) {
      q.set('category', activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1))
    }
    fetch(`/api/products?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filter, overrideFilter])

  const filtered = overrideFilter
    ? products
    : searchQuery && filter === 'all'
    ? products
    : products

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id={anchorId} ref={ref}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-pink-100 overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (filtered.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id={anchorId} ref={ref}>
        <h2 className="text-xl sm:text-2xl font-semibold mb-5">{title}</h2>
        <div className="text-center py-12 border border-dashed border-pink-200 rounded-xl">
          <p className="text-muted-foreground">No hampers here yet. Check back soon.</p>
        </div>
      </section>
    )
  }

  // If insertAfterN is set and we have enough products, split the list
  // so the inserted content renders as a full-width row after the Nth
  // product. On desktop (4 cols), the inserted content uses col-span-4
  // to break the grid row cleanly. On mobile (2 cols), col-span-2.
  const shouldInsert =
    insertContent != null &&
    typeof insertAfterN === 'number' &&
    insertAfterN > 0 &&
    insertAfterN < filtered.length

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id={anchorId} ref={ref}>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{overrideFilter ? overrideFilter.charAt(0).toUpperCase() + overrideFilter.slice(1) : title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gift hampers • hand-packed with love
          </p>
        </div>
        <Button variant="link" className="text-brand hover:text-brand" onClick={() => useUI.getState().goSearch(overrideFilter || title)}>
          View all →
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {shouldInsert
          ? [
              ...filtered.slice(0, insertAfterN!).map((p) => (
                <ProductCard key={p.id} product={p} />
              )),
              <div key="__inserted-content__" className="col-span-2 lg:col-span-4">
                {insertContent}
              </div>,
              ...filtered.slice(insertAfterN!).map((p) => (
                <ProductCard key={p.id} product={p} />
              )),
            ]
          : filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
      </div>
    </section>
  )
}
