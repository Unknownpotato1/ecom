'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronRight, ArrowLeft, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Product, Collection } from '@/lib/types'

const BATCH_SIZE = 8

type SortOption = 'newest' | 'price-low' | 'price-high'

const SORT_LABELS: Record<SortOption, string> = {
  'newest': 'Newest First',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
}

/**
 * SortPanel — the sort/filter panel content. Rendered inside both the
 * desktop sidebar and the mobile bottom sheet. Defined OUTSIDE the
 * CollectionPage component to avoid the "cannot create components
 * during render" lint error.
 */
function SortPanel({
  sort,
  onSortChange,
}: {
  sort: SortOption
  onSortChange: (s: SortOption) => void
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold mb-3">Sort by</h3>
      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
        <button
          key={key}
          onClick={() => onSortChange(key)}
          className={cn(
            'block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
            sort === key
              ? 'bg-brand-soft text-brand font-medium'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {SORT_LABELS[key]}
        </button>
      ))}
    </div>
  )
}

/**
 * Shows all products in a collection with infinite scroll.
 * Loads the collection metadata first (fast), then fetches products
 * in batches of 8 as the user scrolls down.
 *
 * Features:
 *   - Sort/filter panel on the right (newest, price low-high, price high-low)
 *   - Newest products shown first by default (createdAt DESC)
 *   - No product count shown
 */
export function CollectionPage({ collectionId }: { collectionId: string }) {
  const { goHome } = useUI()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sort, setSort] = useState<SortOption>('newest')
  // Mobile filter sheet open state
  const [filterOpen, setFilterOpen] = useState(false)

  // Refs for the sorted product list + pagination
  const sortedProductsRef = useRef<Product[]>([])
  const loadedCountRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch collection + products on mount
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      setLoading(true)
      setProducts([])
      setHasMore(true)
      loadedCountRef.current = 0
    })

    fetch('/api/collections?all=1')
      .then((r) => r.json())
      .then((collData) => {
        if (!active) return
        const all = collData.collections || []
        const coll = all.find((c: Collection) => c.id === collectionId)
          || all.find((c: Collection) => c.slug === collectionId)
        if (coll) {
          setCollection(coll)
          return fetch('/api/products').then((r) => r.json()).then((prodData) => ({ prodData, coll }))
        }
        setLoading(false)
        return null
      })
      .then((result) => {
        if (!active || !result) return
        const { prodData, coll } = result
        const all = prodData.products || []
        // Get products that belong to this collection
        const ordered: Product[] = []
        for (const id of coll.productIds || []) {
          const found = all.find((p: Product) => p.id === id)
          if (found) ordered.push(found)
        }
        // Sort by createdAt DESC (newest first) as the default.
        // This also becomes the base for the sortedProductsRef.
        ordered.sort((a, b) => {
          const ta = new Date(a.createdAt).getTime()
          const tb = new Date(b.createdAt).getTime()
          return tb - ta
        })
        sortedProductsRef.current = ordered
        // Show first batch
        const firstBatch = ordered.slice(0, BATCH_SIZE)
        setProducts(firstBatch)
        loadedCountRef.current = firstBatch.length
        setHasMore(ordered.length > BATCH_SIZE)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [collectionId])

  // Re-sort and re-paginate when the sort option changes
  useEffect(() => {
    if (loading || sortedProductsRef.current.length === 0) return

    const sorted = [...sortedProductsRef.current]
    if (sort === 'newest') {
      sorted.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime()
        const tb = new Date(b.createdAt).getTime()
        return tb - ta
      })
    } else if (sort === 'price-low') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (sort === 'price-high') {
      sorted.sort((a, b) => b.price - a.price)
    }

    sortedProductsRef.current = sorted
    const firstBatch = sorted.slice(0, BATCH_SIZE)
    setProducts(firstBatch)
    loadedCountRef.current = firstBatch.length
    setHasMore(sorted.length > BATCH_SIZE)
  }, [sort])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setTimeout(() => {
      const next = sortedProductsRef.current.slice(
        loadedCountRef.current,
        loadedCountRef.current + BATCH_SIZE
      )
      setProducts((prev) => [...prev, ...next])
      loadedCountRef.current += next.length
      setHasMore(loadedCountRef.current < sortedProductsRef.current.length)
      setLoadingMore(false)
    }, 200)
  }, [loadingMore, hasMore])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore, hasMore, products.length])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-lg font-medium">Products are coming soon — stay tuned!</p>
        <Button className="mt-4 bg-brand text-white hover:shadow-lg" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
        </Button>
      </div>
    )
  }

  // The sort/filter panel is defined OUTSIDE this component (above) as
  // the SortPanel function, and rendered via <SortPanel /> below.

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 fade-up">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{collection.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{collection.name}</h1>
        {/* Mobile filter button — opens the bottom sheet */}
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden border-pink-100 text-foreground"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Sort
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pink-200 rounded-xl">
          <p className="text-lg font-medium">Products are coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">Stay tuned!</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Desktop filter sidebar — right side, sticky */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20 border border-pink-100 rounded-xl p-4">
              <SortPanel sort={sort} onSortChange={setSort} />
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile filter bottom sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFilterOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Sort & Filter</h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SortPanel
              sort={sort}
              onSortChange={(s) => {
                setSort(s)
                setFilterOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
