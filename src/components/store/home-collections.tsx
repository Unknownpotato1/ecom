'use client'

import { useEffect, useState } from 'react'
import { CollectionCarousel } from './collection-carousel'
import { HomeCustomSlot } from './home-custom-slot'
import type { Collection } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Renders the homepage body as an interleaved layout of collections
 * and custom sections.
 *
 * Collections are rendered in position order. Between/before/after each
 * collection, custom sections with matching slots are rendered:
 *
 *   [home-above-hero sections]
 *   [home-before-collection-1 sections]
 *   Collection 1
 *   [home-after-collection-1 sections]
 *   [home-before-collection-2 sections]
 *   Collection 2
 *   [home-after-collection-2 sections]
 *   ... (up to 4 collections)
 *   [home-after-collections sections]
 *   [home-above-footer sections]
 *
 * Legacy slots (storefront, home-in-grid, home-above-products) are mapped
 * to home-above-hero so existing sections still render.
 */
export function HomeCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const visible = (data.collections || []).filter((c: Collection) => c.visible)
        setCollections(visible)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-3 ml-4" />
            <div className="flex gap-3 px-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="shrink-0 w-[57vw] sm:w-[220px] aspect-[3/4] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Determine which legacy slots map to home-above-hero
  // (so existing sections with those slots still render)
  // This is handled inside HomeCustomSlot itself.

  // Build the interleaved layout: custom sections + collections
  return (
    <>
      {/* Custom sections: above collections (between header and first collection) */}
      <HomeCustomSlot slot="home-above-hero" />

      {/* Interleave up to 4 collections with custom sections */}
      {[0, 1, 2, 3].map((idx) => {
        const collection = collections[idx]
        const collectionNum = idx + 1
        return (
          <div key={idx}>
            {/* Custom sections before this collection */}
            <HomeCustomSlot slot={`home-before-collection-${collectionNum}`} />

            {/* The collection carousel */}
            {collection && <CollectionCarousel collection={collection} />}

            {/* Custom sections after this collection */}
            <HomeCustomSlot slot={`home-after-collection-${collectionNum}`} />
          </div>
        )
      })}

      {/* Any collections beyond the 4th (no slots between them) */}
      {collections.slice(4).map((c) => (
        <CollectionCarousel key={c.id} collection={c} />
      ))}

      {/* Custom sections: after all collections */}
      <HomeCustomSlot slot="home-after-collections" />

      {/* Custom sections: above footer */}
      <HomeCustomSlot slot="home-above-footer" />
    </>
  )
}
