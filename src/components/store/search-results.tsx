'use client'

import { useEffect, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { ProductCard } from './product-card'
import { useUI } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Product } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { goSearch, goHome } = useUI()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (!initialQuery) return
    let active = true
    fetch(`/api/products?search=${encodeURIComponent(initialQuery)}`)
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
  }, [initialQuery])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) goSearch(query.trim())
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 fade-up">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Search</span>
      </nav>
      <h1 className="text-2xl font-bold mb-4">Search hampers</h1>
      <form onSubmit={submit} className="flex gap-2 mb-6 max-w-xl">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11" placeholder="Try 'chocolate', 'festive'..." />
        <Button type="submit" className="h-11 bg-brand text-white hover:bg-brand/90 px-5">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <p className="text-sm text-muted-foreground mb-4">
        {loading ? 'Searching...' : `${products.length} result${products.length === 1 ? '' : 's'} for "${initialQuery}"`}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-pink-200 rounded-xl">
          <p className="font-medium">No hampers found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different keyword or browse our categories.</p>
          <Button className="mt-4 bg-brand text-white hover:bg-brand/90" onClick={goHome}>Back to home</Button>
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
