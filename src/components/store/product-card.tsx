'use client'

import { Star, ShoppingBag, Eye, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { formatPrice, productTags, type Product } from '@/lib/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const TONE_STYLES: Record<string, string> = {
  trending: 'bg-brand text-white',
  best: 'bg-amber-500 text-white',
  discount: 'bg-emerald-600 text-white',
  new: 'bg-foreground text-white',
}

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem)
  const { goProduct } = useUI()
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  const tags = productTags(product)
  const image = product.images[0]?.url

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      comparedPrice: product.comparedPrice ?? undefined,
      image: image ?? '',
      maxStock: product.stock || 99,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-pink-100 bg-card transition-all hover:shadow-lg hover:border-brand/40 cursor-pointer"
      onClick={() => goProduct(product.id)}
    >
      <div className="relative aspect-square overflow-hidden bg-pink-50">
        {image ? (
           
          <img
            src={image}
            alt={product.images[0]?.alt || product.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}

        {/* Tags */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {tags.slice(0, 3).map((t, i) => (
            <span
              key={i}
              className={cn(
                'px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide',
                TONE_STYLES[t.tone] || TONE_STYLES.new
              )}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setLiked((v) => !v)
          }}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white"
          aria-label="Save to wishlist"
        >
          <Heart className={cn('h-4 w-4', liked ? 'fill-brand text-brand' : 'text-muted-foreground')} />
        </button>

        {/* Quick view */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            goProduct(product.id)
          }}
          className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          aria-label="Quick view"
        >
          <Eye className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center gap-1 mb-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  'h-3 w-3',
                  n <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">({product.reviewCount})</span>
        </div>

        <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-brand transition-colors">
          {product.title}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{product.description}</p>

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">{formatPrice(product.price)}</span>
            {product.comparedPrice && product.comparedPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.comparedPrice)}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            className={cn(
              'h-9 px-3 text-xs shadow-sm transition-all',
              added ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-brand hover:bg-brand/90 text-white'
            )}
          >
            {added ? 'Added!' : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  )
}
