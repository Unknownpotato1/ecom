export interface Product {
  id: string
  title: string
  slug: string
  description?: string
  longDescription?: string | null
  price: number
  comparedPrice?: number | null
  rating: number
  reviewCount: number
  stock: number
  category?: string | null
  isTrending: boolean
  isBestSeller: boolean
  specifications?: string | null
  tags?: string | null
  createdAt: string
  updatedAt: string
  images: ProductImage[]
  reviews?: Review[]
}

export interface ProductImage {
  id: string
  url: string
  alt?: string | null
  position: number
}

export interface Review {
  id: string
  productId: string
  userName: string
  rating: number
  title?: string | null
  comment?: string | null
  createdAt: string
}

export interface Section {
  id: string
  type: string // "hero" | "products" | "custom" | "categories" | "text"
  title?: string | null
  position: number
  visible: boolean
  config?: string | null
}

export interface CustomSection {
  id: string
  title: string
  html: string
  css?: string | null
  js?: string | null
  position: number
  visible: boolean
  /** Where the section renders: 'storefront' (home page) | 'product-below-actions' (product page, after Add to bag/Buy now/Wishlist) */
  location?: string
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: string
  subtotal: number
  shipping: number
  total: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  notes?: string | null
  createdAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  productId?: string | null
  title: string
  price: number
  quantity: number
  image?: string | null
}

export interface HeroConfig {
  imageUrl: string
  title?: string
  subtitle?: string
  ctaText?: string
  ctaTarget?: string
  badge?: string
  align?: 'left' | 'center' | 'right'
}

export interface SiteSettings {
  hero?: HeroConfig
  announcement?: string
  freeShippingThreshold?: number
  shippingFee?: number
}

export function parseJson<T>(s?: string | null, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function discountPct(price: number, compared?: number | null): number {
  if (!compared || compared <= price) return 0
  return Math.round(((compared - price) / compared) * 100)
}

/**
 * Returns up to 4 tags for a product:
 * - Slot 1 (always first, if discount exists): "X% OFF" — GREEN background
 * - Slots 2-4: up to 3 custom admin tags, each with a DISTINCT color
 *   (pink, amber, blue) in the order they were added
 *
 * The admin enters custom tags in the "Tags" field (comma separated).
 * Only the first 3 custom tags are shown (plus the auto X% OFF = max 4 total).
 */
export function productTags(p: Product): { label: string; tone: string }[] {
  const tags: { label: string; tone: string }[] = []

  // Slot 1: auto X% OFF tag with green background (always first if discount exists)
  const off = discountPct(p.price, p.comparedPrice)
  if (off > 0) {
    tags.push({ label: `${off}% OFF`, tone: 'discount' })
  }

  // Slots 2-4: up to 3 custom tags with distinct colors
  const parsedTags = parseJson<string[]>(p.tags, [])
  const customColors = ['trending', 'best', 'info']
  parsedTags.slice(0, 3).forEach((t, i) => {
    tags.push({ label: t, tone: customColors[i] })
  })

  return tags.slice(0, 4)
}
