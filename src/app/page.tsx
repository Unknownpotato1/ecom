'use client'

import { useEffect, useRef } from 'react'
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
import { NavigationWatcher } from '@/components/store/navigation-watcher'
import { HomeCustomSlot } from '@/components/store/home-custom-slot'
import { trackPageView } from '@/lib/meta-pixel'
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
  const lastTrackedView = useRef<string>('')

  // Fire PageView on SPA view changes (deduplicated — only fires when
  // the view actually changes, not on every re-render)
  useEffect(() => {
    const viewKey = `${view}:${selectedProductId || ''}`
    if (viewKey !== lastTrackedView.current) {
      lastTrackedView.current = viewKey
      trackPageView()
    }
  }, [view, selectedProductId])

  // Admin panel is full-screen — no header/footer
  if (view === 'admin') {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        <NavigationWatcher />
        <AdminPanel />
        <CartDrawer />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <NavigationWatcher />

      {/* Home page: above-header custom sections */}
      {view === 'home' && <HomeCustomSlot slot="home-above-header" />}

      <Header />

      {/* Home page: between header and storefront (above hero/banner) */}
      {view === 'home' && <HomeCustomSlot slot="home-above-hero" />}

      <div className="flex-1">
        {/* Home page: above product list */}
        {view === 'home' && <HomeCustomSlot slot="home-above-products" />}

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

        {/* Home page: below product list */}
        {view === 'home' && <HomeCustomSlot slot="home-below-products" />}
      </div>

      {/* Home page: above footer */}
      {view === 'home' && <HomeCustomSlot slot="home-above-footer" />}

      <Footer />
      <CartDrawer />
    </main>
  )
}
