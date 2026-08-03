'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface InsertPosition {
  /** After how many products to insert (1-based: 2 = after the 2nd product) */
  afterN: number
  /** The content to render at this position */
  content: ReactNode
}

interface Props {
  title: string
  filter: 'all' | 'best' | 'trending' | 'festive' | 'birthday' | 'anniversary'
  anchorId?: string
  listenToFilterEvents?: boolean
  /**
   * Optional insertion positions for custom sections inside the product
   * grid. Each entry specifies after how many products to insert and
   * what content to render there.
   *
   * Multiple sections can be inserted at different positions, e.g.:
   *   inserts={[
   *     { afterN: 4, content: <BannerA /> },
   *     { afterN: 8, content: <BannerB /> },
   *     { afterN: 10, content: <VideoSection /> },
   *   ]}
   *
   * The inserted content spans the full grid width (lg:col-span-4 on
   * desktop, col-span-2 on mobile) so it breaks the grid row cleanly.
   *
   * Pass undefined or null to render nothing (normal behavior).
   */
  insertAfterN?: number | null
  insertContent?: ReactNode
  inserts?: InsertPosition[]
}

export function ProductGrid({ title, filter, anchorId, listenToFilterEvents, insertAfterN, insertContent, inserts }: Props) {
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
    fetch(`/api/products?${q.toString()}`, { cache: 'no-store' })
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

  // Build the list of insert positions.
  // Supports BOTH the legacy single-insert API (insertAfterN + insertContent)
  // and the new multi-insert API (inserts array).
  // All positions are merged and sorted by afterN so sections render
  // in the correct order regardless of which API was used.
  const allInserts: InsertPosition[] = []
  if (inserts && inserts.length > 0) {
    allInserts.push(...inserts.filter((ins) => ins.afterN > 0 && ins.afterN < filtered.length))
  }
  if (insertContent != null && typeof insertAfterN === 'number' && insertAfterN > 0 && insertAfterN < filtered.length) {
    allInserts.push({ afterN: insertAfterN, content: insertContent })
  }
  allInserts.sort((a, b) => a.afterN - b.afterN)

  // Build the final grid children array by interleaving products with
  // inserted sections at the correct positions.
  let gridChildren: ReactNode[]
  if (allInserts.length > 0) {
    gridChildren = []
    let productIndex = 0
    for (const ins of allInserts) {
      // Add products up to the insert position
      while (productIndex < ins.afterN && productIndex < filtered.length) {
        gridChildren.push(<ProductCard key={filtered[productIndex].id} product={filtered[productIndex]} />)
        productIndex++
      }
      // Add the inserted section (full-width row)
      gridChildren.push(
        <div key={`__insert_${ins.afterN}__`} className="col-span-2 lg:col-span-4">
          {ins.content}
        </div>
      )
    }
    // Add remaining products after the last insert
    while (productIndex < filtered.length) {
      gridChildren.push(<ProductCard key={filtered[productIndex].id} product={filtered[productIndex]} />)
      productIndex++
    }
  } else {
    gridChildren = filtered.map((p) => <ProductCard key={p.id} product={p} />)
  }

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
        {gridChildren}
      </div>
    </section>
  )
}
