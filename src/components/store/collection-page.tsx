'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronRight, ArrowLeft, Loader2 } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, Collection } from '@/lib/types'

const BATCH_SIZE = 8

/**
 * Shows all products in a collection with infinite scroll.
 * Loads the collection metadata first (fast), then fetches products
 * in batches of 8 as the user scrolls down.
 */
export function CollectionPage({ collectionId }: { collectionId: string }) {
  const { goHome } = useUI()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const allProductsRef = useRef<Product[]>([])
  const loadedCountRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      setLoading(true)
      setProducts([])
      setHasMore(true)
      loadedCountRef.current = 0
    })

    // Step 1: Fetch the collection metadata (fast — just IDs)
    fetch('/api/collections')
      .then((r) => r.json())
      .then((collData) => {
        if (!active) return
        const coll = (collData.collections || []).find((c: Collection) => c.id === collectionId)
        if (coll) {
          setCollection(coll)
          // Store productIds in a ref so it's available in the next .then()
          allProductsRef.current = [] // will be filled with products, not IDs
          // Pass the collection to the next step via closure
          return fetch('/api/products').then((r) => r.json()).then((prodData) => ({ prodData, coll }))
        }
        setLoading(false)
        return null
      })
      .then((result) => {
        if (!active || !result) return
        const { prodData, coll } = result
        const all = prodData.products || []
        // Order products by the collection's productIds order
        const ordered: Product[] = []
        for (const id of coll.productIds || []) {
          const found = all.find((p: Product) => p.id === id)
          if (found) ordered.push(found)
        }
        allProductsRef.current = ordered
        setTotalCount(ordered.length)
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

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    // Simulate a slight delay so the spinner is visible
    setTimeout(() => {
      const next = allProductsRef.current.slice(
        loadedCountRef.current,
        loadedCountRef.current + BATCH_SIZE
      )
      setProducts((prev) => [...prev, ...next])
      loadedCountRef.current += next.length
      setHasMore(loadedCountRef.current < allProductsRef.current.length)
      setLoadingMore(false)
    }, 200)
  }, [loadingMore, hasMore])

  // Infinite scroll via IntersectionObserver — re-creates observer
  // whenever loadMore changes (i.e. when products are added)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 fade-up">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{collection.name}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{collection.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {totalCount} product{totalCount === 1 ? '' : 's'}
      </p>

      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pink-200 rounded-xl">
          <p className="text-lg font-medium">Products are coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">Stay tuned!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        </>
      )}
    </div>
  )
}
