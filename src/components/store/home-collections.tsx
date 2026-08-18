'use client'

import { useEffect, useState } from 'react'
import { CollectionCarousel } from './collection-carousel'
import type { Collection } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Fetches all visible collections and renders each as a horizontal
 * carousel on the homepage. Positioned between the hero and the
 * product grid.
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

  if (collections.length === 0) return null

  return (
    <>
      {collections.map((c) => (
        <CollectionCarousel key={c.id} collection={c} />
      ))}
    </>
  )
}
