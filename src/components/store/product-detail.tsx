'use client'

import { useEffect, useState } from 'react'
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  Shield,
  RefreshCw,
  Minus,
  Plus,
  Check,
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
import { PincodeChecker } from './pincode-checker'
import { YouMayAlsoLike } from './you-may-also-like'
import { StickyActionBar } from './sticky-action-bar'

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [tab, setTab] = useState<'description' | 'specifications' | 'reviews'>('description')

  // Review form
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const addItem = useCart((s) => s.addItem)
  const openCart = useCart((s) => s.openCart)
  const { goHome } = useUI()

  useEffect(() => {
    let active = true
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setProduct(data.product)
        setLoading(false)
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
      const data = await (await fetch(`/api/products/${productId}`)).json()
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
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-full tracking-wide shadow-sm text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* === Info section === */}
          <div className="px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.title}</h1>

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

            <div className="flex items-end gap-3 mt-4">
              <span className="text-3xl font-bold text-price">{formatPrice(product.price)}</span>
              {product.comparedPrice && product.comparedPrice > product.price && (
                <>
                  <span className="text-base text-compared-price line-through mb-1">
                    {formatPrice(product.comparedPrice)}
                  </span>
                  <span className="text-sm text-price font-medium mb-1">
                    Save {formatPrice(product.comparedPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            {/* Pincode delivery check — between price and quantity picker */}
            <PincodeChecker />

            {/* Row 1: Quantity picker + Wishlist + Add to bag */}
            <div className="mt-5 flex items-center gap-2">
              {/* Quantity picker — thin black border, no internal dividers */}
              <div className="inline-flex items-center rounded-md border border-black overflow-hidden shrink-0">
                <button
                  className="h-11 w-10 inline-flex items-center justify-center hover:bg-brand-soft"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="h-11 min-w-[2.5rem] inline-flex items-center justify-center text-sm font-semibold">
                  {qty}
                </span>
                <button
                  className="h-11 w-10 inline-flex items-center justify-center hover:bg-brand-soft"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Wishlist heart — thin black border */}
              <Button
                size="icon"
                variant="outline"
                className="h-11 w-11 border border-black rounded-md hover:bg-black hover:text-white shrink-0"
                onClick={() => setLiked((v) => !v)}
                aria-label="Wishlist"
              >
                <Heart className={cn('h-5 w-5', liked ? 'fill-brand text-brand' : '')} />
              </Button>

              {/* Add to bag — fills remaining space */}
              <Button
                size="lg"
                onClick={handleAdd}
                className={cn(
                  'flex-1 h-11',
                  added ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-brand hover:shadow-lg text-white'
                )}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Added to bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 mr-2" /> Add to bag
                  </>
                )}
              </Button>
            </div>

            {/* Row 2: Buy now — full width, #f9758d */}
            <Button
              id="inline-buy-now"
              size="lg"
              className="w-full h-11 mt-2 bg-brand hover:shadow-lg text-white"
              onClick={() => {
                handleAdd()
                setTimeout(() => openCart(), 200)
              }}
            >
              Buy now
            </Button>

            {/* Custom sections targeted to product page (location: 'product-below-actions') */}
            <ProductCustomSections />

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
              {[
                { icon: Truck, label: 'Free shipping', sub: 'on orders ₹1499+' },
                { icon: Shield, label: 'Secure packing', sub: 'tamper-proof' },
                { icon: RefreshCw, label: 'Easy returns', sub: 'within 7 days' },
              ].map((b, i) => (
                <div key={i} className="rounded-lg border border-pink-100 bg-brand-soft p-3 text-center">
                  <b.icon className="h-4 w-4 mx-auto mb-1 text-brand" />
                  <div className="font-medium">{b.label}</div>
                  <div className="text-muted-foreground text-[10px]">{b.sub}</div>
                </div>
              ))}
            </div>

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
                      Every Aurora hamper is hand-packed in our Bengaluru studio. We use recyclable kraft boxes,
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

                    {/* Existing reviews */}
                    {reviews.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">No reviews yet. Be the first to review!</p>
                    ) : (
                      reviews.map((r: Review) => (
                        <div key={r.id} className="rounded-lg border border-pink-100 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-brand-soft text-brand font-semibold inline-flex items-center justify-center">
                                {r.userName[0]?.toUpperCase()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{r.userName}</span>
                                {/* Verified Buyer badge */}
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
                      ))
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
    </div>
  )
}
