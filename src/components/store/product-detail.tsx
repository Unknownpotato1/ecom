'use client'

import { useEffect, useState } from 'react'
import {
  Star,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import {
  formatPrice,
  discountPct,
  productTags,
  parseJson,
  type Product,
  type Review,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { SwipeableImage } from './swipeable-image'
import { ProductCustomSections } from './product-custom-sections'
import { YouMayAlsoLike } from './you-may-also-like'
import { StickyActionBar } from './sticky-action-bar'
import { ProductCustomSlot } from './product-custom-slot'
import { trackViewContent } from '@/lib/meta-pixel'
import { UpiDiscountBanner } from './upi-discount-banner'
import { ProductInfoSections } from './product-info-sections'
import { StockStatus } from './star-rating'

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [tab, setTab] = useState<'description' | 'specifications' | 'reviews'>('description')
  const [allReviewsOpen, setAllReviewsOpen] = useState(false)

  // Review form
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const { goHome } = useUI()

  useEffect(() => {
    let active = true
    // Try fetching by ID first. If that fails (404), try by slug.
    fetch(`/api/products/${productId}`, { cache: 'no-store' })
      .then((r) => {
        if (r.ok) return r.json()
        // ID fetch failed — try fetching all products and finding by slug
        return fetch('/api/products', { cache: 'no-store' })
          .then((r2) => r2.json())
          .then((d2) => {
            const found = (d2.products || []).find((p: Product) => p.slug === productId)
            if (found) return { product: found }
            return { product: null }
          })
      })
      .then((data) => {
        if (!active) return
        setProduct(data.product)
        setLoading(false)
        // Fire ViewContent event for Meta Pixel (only once per product load)
        if (data.product) {
          trackViewContent({
            id: data.product.id,
            title: data.product.title,
            price: data.product.price,
            category: data.product.category,
          })
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [productId])

  const handleAdd = () => {
    if (!product) return
    addItem(
      {
        id: product.id,
        productId: product.id,
        title: product.title,
        price: product.price,
        comparedPrice: product.comparedPrice ?? undefined,
        image: product.images[0]?.url ?? '',
        maxStock: product.stock || 99,
      },
      qty
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewName || !reviewComment) {
      toast.error('Please fill your name and review')
      return
    }
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        userName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      }),
    })
    if (res.ok) {
      toast.success('Thanks for your review!')
      setReviewName('')
      setReviewComment('')
      setReviewRating(5)
      // Refresh product
      const data = await (await fetch(`/api/products/${productId}`, { cache: 'no-store' })).json()
      setProduct(data.product)
    } else {
      toast.error('Failed to submit review')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-lg font-medium">Product not found.</p>
        <Button className="mt-4 bg-brand text-white hover:shadow-lg" onClick={goHome}>
          Back to home
        </Button>
      </div>
    )
  }

  const tags = productTags(product)
  const specs = parseJson<Array<{ key: string; value: string }>>(product.specifications, [])
  const off = discountPct(product.price, product.comparedPrice)
  const reviews = product.reviews || []

  return (
    <div className="fade-up overflow-x-hidden">
      {/*
        Layout:
        - Mobile: full-width image (edge-to-edge, no padding, no gap from header),
          then info section with padding below.
        - Desktop: centered 2-column grid (image | info) with padding.
        No breadcrumb. Image uses adaptive mode (natural dimensions, no crop).
        overflow-x-hidden prevents any horizontal gap on the right side.
      */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-8 w-full">
        <div className="grid lg:grid-cols-2 lg:gap-12">
          {/* === Image section === */}
          <div className="relative group">
            <SwipeableImage
              images={product.images}
              className="w-full lg:rounded-xl"
              imageClassName="w-full"
              adaptive
              indicator="bar"
              onIndexChange={setActiveImage}
            />
            {/* Tags overlay (positioned over the image) */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
              {tags.slice(0, 4).map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[11px] font-semibold tracking-wide shadow-sm text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* === Info section === */}
          <div className="px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">
            {/* SLOT: product-after-image */}
            <ProductCustomSlot slot="product-after-image" />

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.title}</h1>

            {/* SLOT: product-after-title */}
            <ProductCustomSlot slot="product-after-title" />

            {/* Clickable star rating — scrolls to reviews section */}
            <button
              onClick={() => {
                setTab('reviews')
                setTimeout(() => {
                  document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 50)
              }}
              className="flex items-center gap-2 mt-2 group cursor-pointer"
              aria-label="View reviews"
            >
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'h-4 w-4 transition-transform group-hover:scale-110',
                      n <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-brand transition-colors">
                {product.rating.toFixed(1)} • {product.reviewCount} reviews
              </span>
            </button>

            {/* In-stock indicator — pulsing green dot + "In Stock" text.
                Rendered directly below the star rating, with equal spacing
                above (below stars) and below (above price). my-3 = 12px top
                and 12px bottom. The price row's own top margin was removed
                so this mb-3 controls the gap to the price, keeping both
                sides equal. The StockStatus component lives in star-rating.tsx. */}
            <div className="my-3">
              <StockStatus />
            </div>

            {/* SLOT: product-after-stars */}
            <ProductCustomSlot slot="product-after-stars" />

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-price">{formatPrice(product.price)}</span>
              {product.comparedPrice && product.comparedPrice > product.price && (
                <>
                  <span className="text-base text-compared-price line-through mb-1">
                    {formatPrice(product.comparedPrice)}
                  </span>
                  {/* "Save ₹XXX" badge — green background, white text.
                      Small pill shape, vertically aligned with the price. */}
                  <span
                    className="text-xs font-semibold mb-1.5 px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#5bb450', color: '#ffffff' }}
                  >
                    Save {formatPrice(product.comparedPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            {/* UPI discount banner — "Get it for ₹XXX (10% off)" with UPI logo.
                Shown directly below the price. */}
            <UpiDiscountBanner price={product.price} />

            {/* Product info sections — Quick Chat + Qty picker, Offers video,
                and Delivery Info (pincode checker). Sits directly below the
                "Get it for ₹XX" UPI banner. mt-6 adds suitable breathing room
                between the UPI banner and this section. Internal name: deliveryinfo. */}
            <div className="mt-6">
              <ProductInfoSections />
            </div>

            {/* SLOT: product-after-price */}
            <ProductCustomSlot slot="product-after-price" />

            {/* SLOT: product-after-pincode (was PincodeChecker, now just a slot) */}
            <ProductCustomSlot slot="product-after-pincode" />

            {/* SLOT: product-after-buttons (inline buttons removed — sticky bar handles add/buy) */}
            <ProductCustomSlot slot="product-after-buttons" />

            {/* Hidden anchor for sticky bar observer — placed where Buy now used to be */}
            <div id="inline-buy-now" className="h-px w-full" aria-hidden="true" />

            {/* Custom sections targeted to product page (legacy product-below-actions) */}
            <ProductCustomSections />

            {/* SLOT: product-after-trust (trust badges removed) */}
            <ProductCustomSlot slot="product-after-trust" />

            {/* Tabs */}
            <div className="mt-8">
              <div className="flex gap-1 border-b border-pink-100">
                {[
                  { key: 'description', label: 'Description' },
                  { key: 'specifications', label: 'Specifications' },
                  { key: 'reviews', label: `Reviews (${reviews.length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key as typeof tab)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                      tab === t.key
                        ? 'border-brand text-brand'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="py-4 text-sm">
                {tab === 'description' && (
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <p>{product.longDescription || 'No description available.'}</p>
                    <p>
                      Every Eviola hamper is hand-packed in our Bengaluru studio. We use recyclable kraft boxes,
                      satin ribbons, and a handwritten note card so your gift feels as thoughtful as it looks.
                    </p>
                  </div>
                )}
                {tab === 'specifications' && (
                  <div className="rounded-lg border border-pink-100 overflow-hidden">
                    {specs.length === 0 ? (
                      <div className="p-4 text-muted-foreground text-center">No specifications listed.</div>
                    ) : (
                      specs.map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            'grid grid-cols-2 gap-2 px-4 py-2.5 text-sm',
                            i % 2 === 1 && 'bg-brand-soft'
                          )}
                        >
                          <span className="text-muted-foreground">{s.key}</span>
                          <span className="font-medium">{s.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {tab === 'reviews' && (
                  <div className="space-y-4" id="reviews-section">
                    {/* Review summary widget */}
                    <div className="rounded-xl border border-pink-100 bg-brand-soft/30 p-5">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Big rating number */}
                        <div className="text-center">
                          <div className="text-4xl font-bold text-foreground">{product.rating.toFixed(1)}</div>
                          <div className="flex items-center justify-center mt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={cn(
                                  'h-4 w-4',
                                  n <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</div>
                        </div>

                        {/* Rating breakdown bars */}
                        <div className="flex-1 w-full space-y-1.5">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviews.filter((r: Review) => r.rating === star).length
                            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                            return (
                              <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="w-3 text-muted-foreground">{star}</span>
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-muted-foreground">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Existing reviews — show max 10 on product page */}
                    {reviews.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">No reviews yet. Be the first to review!</p>
                    ) : (
                      <>
                        {reviews.slice(0, 10).map((r: Review) => (
                          <div key={r.id} className="rounded-lg border border-pink-100 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-brand-soft text-brand font-semibold inline-flex items-center justify-center">
                                  {r.userName[0]?.toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{r.userName}</span>
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                    <Check className="h-2.5 w-2.5" />
                                    Verified Buyer
                                  </span>
                                </div>
                              </div>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={cn(
                                      'h-3 w-3',
                                      n <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                          </div>
                        ))}
                        {reviews.length > 10 && (
                          <button
                            onClick={() => setAllReviewsOpen(true)}
                            className="w-full py-3 mt-2 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand-soft transition-colors"
                          >
                            See all {reviews.length} reviews →
                          </button>
                        )}
                      </>
                    )}

                    <Separator />
                    <form onSubmit={submitReview} className="space-y-3">
                      <h4 className="text-sm font-semibold">Write a review</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="rev-name" className="text-xs">Your name</Label>
                          <Input
                            id="rev-name"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            placeholder="e.g. Anjali S."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rating</Label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setReviewRating(n)}
                                aria-label={`Rate ${n} stars`}
                              >
                                <Star
                                  className={cn(
                                    'h-6 w-6',
                                    n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience..."
                        rows={3}
                      />
                      <Button type="submit" className="bg-brand text-white hover:shadow-lg">
                        Submit review
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SLOT: product-after-tabs (after description/specs/reviews tabs) */}
      <ProductCustomSlot slot="product-after-tabs" />

      {/* SLOT: product-bottom (before "You may also like") */}
      <ProductCustomSlot slot="product-bottom" />

      {/* You may also like — other products */}
      <YouMayAlsoLike currentProductId={productId} />

      {/* Sticky Add to bag / Buy now bar (mobile only) */}
      <StickyActionBar
        qty={qty}
        added={added}
        onAdd={handleAdd}
        onBuyNow={() => {
          handleAdd()
          setTimeout(() => openCart(), 200)
        }}
      />

      {/* Full-screen all reviews overlay */}
      {allReviewsOpen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col"
          style={{ animation: 'aurora-fade-up 0.3s ease-out' }}
        >
          {/* Header with close button */}
          <div className="sticky top-0 bg-white border-b border-pink-100 px-4 py-3 flex items-center justify-between z-10">
            <h2 className="text-base font-semibold">All Reviews ({reviews.length})</h2>
            <button
              onClick={() => setAllReviewsOpen(false)}
              className="h-9 w-9 rounded-full hover:bg-brand-soft flex items-center justify-center"
              aria-label="Close reviews"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Review summary widget */}
          <div className="px-4 py-4 border-b border-pink-100 bg-brand-soft/30">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{product.rating.toFixed(1)}</div>
                <div className="flex items-center justify-center mt-1">
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
                <div className="text-xs text-muted-foreground mt-1">{product.reviewCount} reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r: Review) => r.rating === star).length
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* All reviews list (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 fancy-scroll">
            {reviews.map((r: Review) => (
              <div key={r.id} className="rounded-lg border border-pink-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand-soft text-brand font-semibold inline-flex items-center justify-center">
                      {r.userName[0]?.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.userName}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                        <Check className="h-2.5 w-2.5" />
                        Verified Buyer
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          'h-3 w-3',
                          n <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
