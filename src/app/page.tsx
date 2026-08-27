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
import { PublicPage } from '@/components/store/public-page'
import { PromoSlideshow } from '@/components/store/promo-slideshow'
import { CategorySection } from '@/components/store/category-section'
import WhatsAppButton from '@/components/store/whatsapp-button'
import { ErrorBoundary } from '@/components/error-boundary'
import { trackPageView } from '@/lib/meta-pixel'
import { useUI } from '@/lib/ui-store'

export default function Home() {
  const { view, selectedProductId, selectedCollectionId, selectedPageSlug, searchQuery } = useUI()
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
        <ErrorBoundary>
          <AdminPanel />
        </ErrorBoundary>
        <CartDrawer />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <NavigationWatcher />

      {/* StickyHeader wraps the countdown (always sticky) + Header (dynamic).
          The countdown only shows on home, product, and collection pages —
          not on checkout, about, orders, profile, etc. */}
      <StickyHeader
        countdownSlot={
          (view === 'home' || view === 'product' || view === 'collection') ? (
            <HomeCustomSlot slot="home-above-header" />
          ) : null
        }
      >
        <Header />
      </StickyHeader>

      <div className="flex-1">
        <ErrorBoundary>
          {/* Promo slideshow (marquee + image carousel). Home view only —
              does NOT show on product/checkout/about/etc. pages. Sits
              directly below the header. */}
          {view === 'home' && <PromoSlideshow />}

          {/* Category section (4 collection tiles + buttons). Home view
              only. Sits directly below the slideshow. Internal id
              "4collection" for reference. */}
          {view === 'home' && <CategorySection />}

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
          {view === 'page' && selectedPageSlug && (
            <PublicPage key={selectedPageSlug} slug={selectedPageSlug} />
          )}
          {view === 'profile' && <Profile />}
        </ErrorBoundary>
      </div>

      {/* Footer — hidden on checkout and order-success views.
          Checkout is a focused conversion flow; showing the footer
          there adds visual clutter and gives the customer a way to
          wander off mid-purchase. Order-success is a thank-you page
          where the footer is similarly unnecessary. All other views
          (home, product, collection, about, orders, profile, search,
          page) show the footer normally. */}
      {view !== 'checkout' && view !== 'order-success' && <Footer />}
      <CartDrawer />
      {/* Floating WhatsApp button — bottom-right corner.
          Hidden on checkout and when cart is open (handled inside the
          component). Raised above the sticky action bar on product pages. */}
      <WhatsAppButton />
    </main>
  )
}
