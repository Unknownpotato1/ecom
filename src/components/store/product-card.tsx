'use client'

import { Star, ShoppingBag, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { formatPrice, productTags, type Product } from '@/lib/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SwipeableImage } from './swipeable-image'

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem)
  const { goProduct } = useUI()
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  const tags = productTags(product)
  const images = product.images.length > 0
    ? product.images
    : [{ url: '', alt: product.title, id: 'placeholder', position: 0 }]

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      comparedPrice: product.comparedPrice ?? undefined,
      image: product.images[0]?.url ?? '',
      maxStock: product.stock || 99,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-pink-100 bg-card transition-all hover:shadow-lg hover:border-brand cursor-pointer"
      onClick={() => goProduct(product.id)}
    >
      <div className="relative aspect-square overflow-hidden bg-pink-50">
        <SwipeableImage
          images={images}
          className="absolute inset-0 h-full w-full"
          imageClassName="transition-transform duration-500 group-hover:scale-105"
          objectFit="cover"
          indicator="dots"
          threshold={30}
        />

        {/* Tags */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {tags.slice(0, 4).map((t, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide shadow-sm text-white"
              style={{ backgroundColor: t.color }}
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
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white z-10"
          aria-label="Save to wishlist"
        >
          <Heart className={cn('h-4 w-4', liked ? 'fill-brand text-brand' : 'text-muted-foreground')} />
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

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-price">{formatPrice(product.price)}</span>
            {product.comparedPrice && product.comparedPrice > product.price && (
              <span className="text-xs text-compared-price line-through">{formatPrice(product.comparedPrice)}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            className={cn(
              'h-9 px-3 text-xs shadow-sm transition-all',
              added ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-brand hover:shadow-lg text-white'
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
