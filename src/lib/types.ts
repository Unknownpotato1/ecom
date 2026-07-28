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
 * Returns ONLY the custom tags the admin added to the product (via the "Tags" field).
 * No auto-generated tags (Trending, Best Seller, X% OFF) — only what the admin explicitly enters.
 * All custom tags use the brand color for consistency.
 */
export function productTags(p: Product): { label: string; tone: 'custom' }[] {
  const parsedTags = parseJson<string[]>(p.tags, [])
  return parsedTags.map((t) => ({ label: t, tone: 'custom' as const }))
}
