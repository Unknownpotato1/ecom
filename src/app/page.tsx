'use client'

import { useEffect, useRef } from 'react'
import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
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
import { HomeCollections } from '@/components/store/home-collections'
import { CollectionPage } from '@/components/store/collection-page'
import { AboutPage } from '@/components/store/about-page'
import { StickyHeader } from '@/components/store/sticky-header'
import { trackPageView } from '@/lib/meta-pixel'
import { useUI } from '@/lib/ui-store'

export default function Home() {
  const { view, selectedProductId, selectedCollectionId, searchQuery } = useUI()
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

      {/* StickyHeader wraps the countdown (always sticky) + Header (dynamic:
          hides on scroll down, slides in on scroll up — even 1px).
          The countdown shows on ALL pages (home, product, collection, etc.)
          so users always see it. */}
      <StickyHeader
        countdownSlot={<HomeCustomSlot slot="home-above-header" />}
      >
        <Header />
      </StickyHeader>

      <div className="flex-1">
        {/* Home page: collections + custom sections (interleaved layout) */}
        {view === 'home' && <HomeCollections />}
        {view === 'product' && selectedProductId && (
          <ProductDetail key={selectedProductId} productId={selectedProductId} />
        )}
        {view === 'collection' && selectedCollectionId && (
          <CollectionPage collectionId={selectedCollectionId} />
        )}
        {view === 'checkout' && <Checkout />}
        {view === 'order-success' && <OrderSuccess />}
        {view === 'search' && <SearchResults initialQuery={searchQuery} />}
        {view === 'orders' && <Orders />}
        {view === 'about' && <AboutPage />}
        {view === 'profile' && <Profile />}
      </div>

      <Footer />
      <CartDrawer />
    </main>
  )
}
