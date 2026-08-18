'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import type { Product, Collection } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  collection: Collection
}

/**
 * Horizontal-scrolling carousel for a collection on the homepage.
 *
 * - Shows 2.25 products at a time on mobile (snap to show 2 full + 0.25 peek)
 * - Left margin so the first product doesn't touch the screen edge
 * - Smooth touch-responsive swipe with CSS scroll-snap
 * - "View All" button at the end navigates to the collection page
 */
export function CollectionCarousel({ collection }: Props) {
  const { goCollection } = useUI()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Each card takes 1/2.25 of the viewport width on mobile,
  // so exactly 2.25 cards are visible at any time.
  // On desktop, cards are a fixed 220px wide.
  const CARD_WIDTH_MOBILE = 'calc((100vw - 2rem) / 2.25)' // 2.25 visible with 1rem padding each side
  const CARD_WIDTH_DESKTOP = '220px'

  useEffect(() => {
    let active = true
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const all = data.products || []
        const featured = collection.featuredProductIds
          .map((id) => all.find((p: Product) => p.id === id))
          .filter(Boolean) as Product[]
        if (featured.length < 5) {
          const remaining = collection.productIds
            .filter((id) => !collection.featuredProductIds.includes(id))
            .map((id) => all.find((p: Product) => p.id === id))
            .filter(Boolean) as Product[]
          featured.push(...remaining.slice(0, 5 - featured.length))
        }
        setProducts(featured.slice(0, 5))
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [collection.id, collection.featuredProductIds, collection.productIds])

  if (loading) {
    return (
      <section className="py-6">
        <div className="px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{collection.name}</h2>
        </div>
        <div className="flex gap-3 pl-4 sm:pl-6 lg:pl-8 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-[calc((100vw-2rem)/2.25)] sm:w-[220px] aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="py-6">
      {/* Title + View All */}
      <div className="px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{collection.name}</h2>
        <button
          onClick={() => goCollection(collection.id)}
          className="text-sm font-medium text-brand hover:text-brand-deep flex items-center gap-1"
        >
          View All <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Horizontal scroll carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          scrollPaddingLeft: '1rem',
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="shrink-0"
            style={{
              width: CARD_WIDTH_MOBILE,
              maxWidth: CARD_WIDTH_DESKTOP,
              scrollSnapAlign: 'start',
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
        {/* View All card at the end */}
        <button
          onClick={() => goCollection(collection.id)}
          className="shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand rounded-lg text-brand hover:bg-brand-soft transition-colors"
          style={{
            width: CARD_WIDTH_MOBILE,
            maxWidth: CARD_WIDTH_DESKTOP,
            aspectRatio: '3/4',
            scrollSnapAlign: 'start',
          }}
        >
          <ChevronRight className="h-6 w-6" />
          <span className="text-sm font-medium">View All</span>
        </button>
      </div>
    </section>
  )
}
