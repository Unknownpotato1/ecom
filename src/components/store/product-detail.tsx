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

const TONE_STYLES: Record<string, string> = {
  trending: 'bg-brand text-white',
  best: 'bg-amber-500 text-white',
  discount: 'bg-emerald-600 text-white',
  new: 'bg-foreground text-white',
}

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
    <div className="fade-up">
      {/*
        Layout:
        - Mobile: full-width image (edge-to-edge, no padding, no gap from header),
          then info section with padding below.
        - Desktop: centered 2-column grid (image | info) with padding.
        No breadcrumb. Image uses object-contain (not cropped).
      */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-8">
        <div className="grid lg:grid-cols-2 lg:gap-12">
          {/* === Image section === */}
          <div className="relative group">
            <SwipeableImage
              images={product.images}
              className="w-full h-[55vh] sm:h-[65vh] lg:h-[75vh] lg:rounded-xl bg-pink-50 lg:border lg:border-pink-100"
              imageClassName="w-full h-full"
              objectFit="contain"
              indicator="bar"
              onIndexChange={setActiveImage}
            />
            {/* Tags overlay (positioned over the image) */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
              {tags.slice(0, 3).map((t, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-semibold rounded-full tracking-wide shadow-sm',
                    TONE_STYLES[t.tone] || TONE_STYLES.new
                  )}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* === Info section === */}
          <div className="px-4 sm:px-6 lg:px-0 pt-6 lg:pt-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.title}</h1>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
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
              <span className="text-sm text-muted-foreground">
                {product.rating.toFixed(1)} • {product.reviewCount} reviews
              </span>
            </div>

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
            <p className="text-xs text-muted-foreground mt-1">Inclusive of all taxes</p>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Quantity + Add */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-md border border-pink-200 overflow-hidden">
                <button
                  className="h-10 w-10 inline-flex items-center justify-center hover:bg-brand-soft"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="h-10 min-w-[3rem] inline-flex items-center justify-center text-sm font-medium border-x border-pink-100">
                  {qty}
                </span>
                <button
                  className="h-10 w-10 inline-flex items-center justify-center hover:bg-brand-soft"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={handleAdd}
                className={cn(
                  'flex-1 min-w-[180px] h-11',
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

              <Button
                size="lg"
                variant="outline"
                className="h-11 border-pink-200 hover:bg-brand-soft hover:text-brand"
                onClick={() => {
                  handleAdd()
                  setTimeout(() => openCart(), 200)
                }}
              >
                Buy now
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-11 w-11 border-pink-200"
                onClick={() => setLiked((v) => !v)}
                aria-label="Wishlist"
              >
                <Heart className={cn('h-4 w-4', liked ? 'fill-brand text-brand' : '')} />
              </Button>
            </div>

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
                    <p>{product.longDescription || product.description}</p>
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
                  <div className="space-y-4">
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
                              <div>
                                <div className="text-sm font-medium">{r.userName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </div>
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
    </div>
  )
}
