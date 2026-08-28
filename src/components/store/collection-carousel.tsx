'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
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
  const CARD_WIDTH_MOBILE = 'calc((100vw - 1rem - 1.25 * 0.75rem) / 2.25)' // 2.25 visible: viewport - left padding - gaps between 2.25 cards
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
      {/* Title only — "View All" link removed from title row per user request. */}
      <div className="px-4 sm:px-6 lg:px-8 mb-3">
        <h2 className="text-xl font-semibold tracking-tight">{collection.name}</h2>
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
            <ProductCard product={product} compact />
          </div>
        ))}

        {/*
          "View All" — minimal inline element as the last carousel item.
          Just black text + a black arrow, no card, no border, no fill.
          Same width + snap behavior as a product card so it lands on
          the same snap points. Vertically centered so it sits next to
          the product cards cleanly. Tapping navigates to the collection
          page (same as the full-width button below).
        */}
        <button
          type="button"
          onClick={() => goCollection(collection.id, collection.slug)}
          className="shrink-0 flex items-center justify-center gap-1.5 text-foreground hover:text-brand transition-colors cursor-pointer"
          style={{
            width: CARD_WIDTH_MOBILE,
            maxWidth: CARD_WIDTH_DESKTOP,
            scrollSnapAlign: 'start',
          }}
          aria-label={`View all products in ${collection.name}`}
        >
          <span className="text-sm font-medium">View All</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* "View All" button — full-width, below the carousel.
          Automatically rendered for EVERY collection (existing + future).
          No slot assignment needed — it's built into the carousel component.
          Styled to match the store: brand pink, white text, no radius,
          14px font, 600 weight, full width minus 16px side margin. */}
      <button
        onClick={() => goCollection(collection.id, collection.slug)}
        className="block mx-4 sm:mx-6 lg:mx-8 mt-4 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] py-3 bg-brand text-white text-center text-sm font-semibold hover:opacity-85 transition-opacity"
      >
        View All
      </button>
    </section>
  )
}
