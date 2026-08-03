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
import { NavigationWatcher } from '@/components/store/navigation-watcher'
import { HomeCustomSlot } from '@/components/store/home-custom-slot'
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
        <NavigationWatcher />
        <AdminPanel />
        <CartDrawer />
      </main>
    )
  }

  // Determine if we should keep the Storefront mounted but hidden.
  // When navigating home → product → back, the Storefront would normally
  // unmount (destroying all state: carousels, countdowns, fetched data,
  // scroll position) and remount from scratch on return. To prevent this,
  // we keep the Storefront mounted whenever the view is 'home' OR 'product'
  // — it's hidden via CSS (display:none) when on the product page, but
  // its internal state is preserved. When the user taps back, the
  // Storefront is simply un-hidden, instantly restoring the exact same
  // state (including carousel positions, fetched products, etc.).
  //
  // For other views (checkout, orders, profile, search), the Storefront
  // is NOT mounted — those are separate flows that don't need it.
  const keepStorefrontAlive = view === 'home' || view === 'product'

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <NavigationWatcher />

      {/* Home page: above-header custom sections.
          Hidden (not unmounted) when on product page to preserve state. */}
      {view === 'home' && <HomeCustomSlot slot="home-above-header" />}

      <Header />

      {/* Home page: between header and storefront (above hero/banner) */}
      {view === 'home' && <HomeCustomSlot slot="home-above-hero" />}

      <div className="flex-1">
        {/* Home page: above product list */}
        {view === 'home' && <HomeCustomSlot slot="home-above-products" />}

        {/* Storefront — kept mounted (but hidden) when on product page
            to preserve all state (carousels, countdowns, fetched data).
            The 'hidden' class sets display:none, which preserves the
            component's internal state in memory. */}
        {keepStorefrontAlive && (
          <div className={view === 'home' ? '' : 'hidden'}>
            <Storefront heroFallback={DEFAULT_HERO} />
          </div>
        )}

        {/* Product detail — rendered on top of the hidden Storefront.
            The Storefront is display:none, so this is the only visible
            content. */}
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
