'use client'

import { useEffect, useState } from 'react'
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shows other products on the product detail page ("You may also like").
 * Fetches all products, excludes the current one, and shows up to 4.
 */
export function YouMayAlsoLike({ currentProductId }: { currentProductId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const all = (data.products || []) as Product[]
        // Exclude current product, take up to 4
        const others = all.filter((p) => p.id !== currentProductId).slice(0, 4)
        setProducts(others)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [currentProductId])

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-5">You may also like</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-5">You may also like</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
