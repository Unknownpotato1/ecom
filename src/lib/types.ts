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
 * - Slot 1 (always first, if discount exists): "X% OFF" — GREEN (#5bb450)
 * - Slots 2-4: up to 3 custom admin tags, each with its own custom color
 *   (set by the admin via the color picker in the product form)
 *
 * Tags are stored as JSON: [{label, color}, ...]
 * If the old format (string array) is found, it's handled gracefully.
 */
export interface ProductTag {
  label: string
  color: string // hex color, e.g. "#f9758d"
}

export function productTags(p: Product): ProductTag[] {
  const tags: ProductTag[] = []

  // Slot 1: auto X% OFF tag with green background (always first if discount exists)
  const off = discountPct(p.price, p.comparedPrice)
  if (off > 0) {
    tags.push({ label: `${off}% OFF`, color: '#5bb450' })
  }

  // Slots 2-4: up to 3 custom tags with admin-set colors
  const raw = p.tags
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.slice(0, 3).forEach((t: unknown) => {
          if (typeof t === 'string') {
            // Old format: string array → default to brand color
            tags.push({ label: t, color: '#f9758d' })
          } else if (t && typeof t === 'object' && 'label' in t) {
            const tag = t as { label: string; color?: string }
            tags.push({ label: tag.label, color: tag.color || '#f9758d' })
          }
        })
      }
    } catch {
      // ignore parse errors
    }
  }

  return tags.slice(0, 4)
}
