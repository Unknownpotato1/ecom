'use client'

import { StarRating } from './star-rating'
import { BagIcon } from './bag-icon'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { formatPrice, productTags, type Product } from '@/lib/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SwipeableImage } from './swipeable-image'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils'

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem)
  const { goProduct } = useUI()
  const [added, setAdded] = useState(false)

  // Sold out = stock is 0 (or missing). When sold out, the card shows a
  // "Sold Out" overlay on the image and the cart button is hidden.
  const soldOut = !product.stock || product.stock === 0

  const tags = productTags(product)
  // Product card images display at ~200px on mobile (2 per row), ~220px on
  // desktop. w_400 covers 2x retina displays without over-serving.
  const CARD_IMAGE_WIDTH = 400
  const images = product.images.length > 0
    ? product.images.map((img) => ({ ...img, url: optimizeCloudinaryUrl(img.url, CARD_IMAGE_WIDTH) }))
    : [{ url: '', alt: product.title, id: 'placeholder', position: 0 }]

  const handleAdd = (e: React.MouseEvent) => {
    if (soldOut) return
    e.stopPropagation()
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      comparedPrice: product.comparedPrice ?? undefined,
      // Cart thumbnail is small (64x64) — use a smaller width for the cart
      // image to save bandwidth. w_200 covers 2x retina for a 64-100px thumb.
      image: optimizeCloudinaryUrl(product.images[0]?.url, 200) ?? '',
      maxStock: product.stock || 99,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  // "Get it for" price = 20% off the selling price (floor to nearest rupee).
  // Shown below the price/comparedPrice row on the product card.
  const getItForPrice = Math.floor(product.price * 0.8)

  return (
    <article
      className="group relative flex flex-col overflow-hidden border border-black/15 bg-card transition-all hover:shadow-lg hover:border-brand cursor-pointer"
      onClick={() => goProduct(product.id, product.slug)}
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
              className="px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-sm text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Sold Out overlay — shown when stock === 0. Semi-transparent
            dark layer over the image with a "Sold Out" pill in the center.
            pointer-events-none so clicks still pass through to the card
            (customer can still tap the card to view the product detail). */}
        {soldOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-none">
            <span className="px-3 py-1 bg-white text-red-600 text-xs font-bold tracking-wide shadow-md">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Cart button — replaces the old heart/wishlist button.
            Top-right corner of the image. Tapping it adds the product to
            the cart (same as the old "Add" button next to the price did).
            Shows a checkmark + "Added" state for 1.5s after adding.
            Hidden when sold out (the SOLD OUT overlay covers the image
            anyway, so no purchase action makes sense). */}
        {!soldOut && (
          <button
            onClick={handleAdd}
            className={cn(
              'absolute top-2 right-2 h-8 w-8 rounded-full backdrop-blur flex items-center justify-center shadow-sm z-10 transition-colors',
              added ? 'bg-emerald-600 text-white' : 'bg-white/85 text-foreground hover:bg-white'
            )}
            aria-label={added ? 'Added to bag' : 'Add to bag'}
          >
            {added ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <BagIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center gap-1 mb-1">
          <StarRating rating={product.rating} sizeClass="h-3 w-3" />
          <span className="text-[11px] text-muted-foreground">({product.reviewCount})</span>
        </div>

        <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-brand transition-colors">
          {product.title}
        </h3>

        {/* Price row — price and compared price side by side (horizontal).
            Removed the old "Add" button that used to sit to the right of
            the price. The cart action is now the icon button on the image. */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-price">{formatPrice(product.price)}</span>
            {product.comparedPrice && product.comparedPrice > product.price && (
              <span className="text-xs text-compared-price line-through">{formatPrice(product.comparedPrice)}</span>
            )}
          </div>
          {/* "Get it for ₹XX" — 20% off the selling price. Full-width pink
              bar (breaks out of the card's p-3/p-4 padding via -mx-3/-mx-4
              so it spans edge-to-edge with the same side margins as the
              product title). White text + white sparkles icon on brand-pink
              (#f9758d) background, 0 radius. Font: text-sm (14px) bold. */}
          {product.price > 0 && (
            <div
              className="flex items-center gap-1.5 mt-2 -mx-3 sm:-mx-4 text-sm font-bold text-white"
              style={{ backgroundColor: '#f9758d', borderRadius: 0, padding: '6px 12px' }}
            >
              {/* Sparkles/badge icon — draws attention to the offer */}
              <svg
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.891 15.107 15.11 8.89m-5.183-.52h.01m3.089 7.254h.01M14.08 3.902a2.849 2.849 0 0 0 2.176.902 2.845 2.845 0 0 1 2.94 2.94 2.849 2.849 0 0 0 .901 2.176 2.847 2.847 0 0 1 0 4.16 2.848 2.848 0 0 0-.901 2.175 2.843 2.843 0 0 1-2.94 2.94 2.848 2.848 0 0 0-2.176.902 2.847 2.847 0 0 1-4.16 0 2.85 2.85 0 0 0-2.176-.902 2.845 2.845 0 0 1-2.94-2.94 2.848 2.848 0 0 0-.901-2.176 2.848 2.848 0 0 1 0-4.16 2.849 2.849 0 0 0 .901-2.176 2.845 2.845 0 0 1 2.941-2.94 2.849 2.849 0 0 0 2.176-.901 2.847 2.847 0 0 1 4.159 0Z"
                />
              </svg>
              <span>Get it for</span>
              <span className="font-extrabold">{formatPrice(getItForPrice)}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
