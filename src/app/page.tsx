'use client'

import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { Storefront } from '@/components/store/storefront'
import { CartDrawer } from '@/components/store/cart-drawer'
import { ProductDetail } from '@/components/store/product-detail'
import { Checkout } from '@/components/store/checkout'
import { OrderSuccess } from '@/components/store/order-success'
import { SearchResults } from '@/components/store/search-results'
import { Orders } from '@/components/store/orders'
import { Profile } from '@/components/auth/profile'
import { AdminPanel } from '@/components/admin/admin-panel'
import { useUI } from '@/lib/ui-store'
import type { HeroConfig } from '@/lib/types'

const DEFAULT_HERO: HeroConfig = {
  imageUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1600&q=80&auto=format&fit=crop',
  title: 'Gifts that glow',
  subtitle: 'Thoughtfully curated hampers for every occasion — hand-packed with love from Bengaluru.',
  ctaText: 'Shop Best Sellers',
  badge: 'New Spring Collection',
  align: 'left',
}

export default function Home() {
  const { view, selectedProductId, searchQuery } = useUI()

  // Admin panel is full-screen — no header/footer
  if (view === 'admin') {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        <AdminPanel />
        <CartDrawer />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1">
        {view === 'home' && (
          <Storefront heroFallback={DEFAULT_HERO} />
        )}
        {view === 'product' && selectedProductId && (
          <ProductDetail key={selectedProductId} productId={selectedProductId} />
        )}
        {view === 'checkout' && <Checkout />}
        {view === 'order-success' && <OrderSuccess />}
        {view === 'search' && <SearchResults initialQuery={searchQuery} />}
        {view === 'orders' && <Orders />}
        {view === 'profile' && <Profile />}
      </div>

      <Footer />
      <CartDrawer />
    </main>
  )
}
