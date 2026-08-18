'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { ProductCard } from './product-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, Collection } from '@/lib/types'

/**
 * Shows all products in a collection in a grid layout.
 * Accessed from the homepage carousel "View All" button.
 */
export function CollectionPage({ collectionId }: { collectionId: string }) {
  const { goHome } = useUI()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/collections').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([collData, prodData]) => {
        if (!active) return
        const coll = (collData.collections || []).find((c: Collection) => c.id === collectionId)
        const allProducts = prodData.products || []
        if (coll) {
          setCollection(coll)
          const collProducts = coll.productIds
            .map((id: string) => allProducts.find((p: Product) => p.id === id))
            .filter(Boolean) as Product[]
          setProducts(collProducts)
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [collectionId])

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
        <p className="text-lg font-medium">Collection not found.</p>
        <Button className="mt-4 bg-brand text-white hover:shadow-lg" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 fade-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{collection.name}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{collection.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">{products.length} product{products.length === 1 ? '' : 's'}</p>

      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pink-200 rounded-xl">
          <p className="text-muted-foreground">No products in this collection yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
