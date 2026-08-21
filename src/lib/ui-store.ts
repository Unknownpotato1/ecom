import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewName =
  | 'home'
  | 'product'
  | 'checkout'
  | 'order-success'
  | 'admin'
  | 'profile'
  | 'orders'
  | 'search'
  | 'collection'
  | 'about'

/**
 * Shape of the history entry we push into the browser's session stack
 * whenever the user navigates between views. Storing the view + product
 * id inside `history.state` lets us restore the exact UI state when the
 * user taps the browser/Android back or forward button.
 *
 * selectedProductSlug / selectedCollectionSlug: stored alongside the IDs
 * so that when we restore from history.state, we know the slug to use
 * in the URL.
 */
export interface HistoryEntryState {
  view: ViewName
  selectedProductId: string | null
  selectedCollectionId?: string | null
  selectedProductSlug?: string | null
  selectedCollectionSlug?: string | null
  searchQuery?: string
}

/**
 * Build the URL that represents a given view.
 *
 * Uses SEO-friendly slugs for product and collection URLs:
 *   /product/{product-slug}
 *   /collection/{collection-slug}
 *
 * For pages/policies, uses clean URLs:
 *   /pages/about-us, /pages/contact-us
 *   /policies/privacy-policy, /policies/terms-and-conditions, etc.
 *
 * Old ID-based URLs (/product/{id}, /collection/{id}) still work —
 * the NavigationWatcher resolves them via API and 301-redirects.
 */
function buildUrl(view: ViewName, selectedProductId: string | null, searchQuery?: string): string {
  const state = get()
  switch (view) {
    case 'product': {
      const slug = state.selectedProductSlug
      return `/product/${slug || selectedProductId || ''}`
    }
    case 'checkout':
      return '/checkout'
    case 'order-success':
      return '/order-success'
    case 'admin':
      return '/admin'
    case 'profile':
      return '/profile'
    case 'orders':
      return '/orders'
    case 'search':
      return `/search?q=${encodeURIComponent(searchQuery ?? '')}`
    case 'collection': {
      const slug = state.selectedCollectionSlug
      return `/collection/${slug || state.selectedCollectionId || ''}`
    }
    case 'about':
      return '/pages/about-us'
    case 'home':
    default:
      return '/'
  }
}

/**
 * Push a new history entry for the given view.
 */
function pushHistory(view: ViewName, selectedProductId: string | null, searchQuery?: string) {
  if (typeof window === 'undefined') return
  const url = buildUrl(view, selectedProductId, searchQuery)
  const state = get()
  const historyState: HistoryEntryState = {
    view,
    selectedProductId,
    selectedCollectionId: state.selectedCollectionId,
    selectedProductSlug: state.selectedProductSlug,
    selectedCollectionSlug: state.selectedCollectionSlug,
    searchQuery,
  }
  try {
    window.history.pushState(historyState, '', url)
  } catch {
    // pushState can throw on cross-origin or file:// — fail silently
  }
}

/**
 * Replace the current history entry (no new stack entry).
 */
export function replaceHistory(view: ViewName, selectedProductId: string | null, searchQuery?: string) {
  if (typeof window === 'undefined') return
  const url = buildUrl(view, selectedProductId, searchQuery)
  const state = get()
  const historyState: HistoryEntryState = {
    view,
    selectedProductId,
    selectedCollectionId: state.selectedCollectionId,
    selectedProductSlug: state.selectedProductSlug,
    selectedCollectionSlug: state.selectedCollectionSlug,
    searchQuery,
  }
  try {
    window.history.replaceState(historyState, '', url)
  } catch {
    // Same as pushHistory — fail silently
  }
}

interface UIState {
  view: ViewName
  selectedProductId: string | null
  selectedProductSlug: string | null
  selectedCollectionId: string | null
  selectedCollectionSlug: string | null
  searchQuery: string
  searchOpen: boolean
  mobileMenuOpen: boolean
  homeScrollY: number
  // navigation
  goHome: () => void
  goProduct: (productId: string, slug?: string) => void
  goCheckout: () => void
  goOrderSuccess: () => void
  goAdmin: () => void
  goProfile: () => void
  goOrders: () => void
  goSearch: (query: string) => void
  goCollection: (collectionId: string, slug?: string) => void
  setSearchOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  restoreFromHistory: (state: HistoryEntryState) => void
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      view: 'home',
      selectedProductId: null,
      selectedProductSlug: null,
      selectedCollectionId: null,
      selectedCollectionSlug: null,
      searchQuery: '',
      searchOpen: false,
      mobileMenuOpen: false,
      homeScrollY: 0,
      goHome: () => {
        set({ view: 'home', selectedProductId: null, selectedProductSlug: null })
        pushHistory('home', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goProduct: (productId, slug) => {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('aurora:home-scroll-y', String(window.scrollY))
          } catch {}
        }
        const urlSlug = slug || productId
        set({ view: 'product', selectedProductId: productId, selectedProductSlug: slug || null })
        // Push history directly with the slug URL — don't rely on buildUrl
        // reading from get() because the persist middleware might not have
        // committed the state yet.
        if (typeof window !== 'undefined') {
          const url = `/product/${urlSlug}`
          const historyState: HistoryEntryState = {
            view: 'product',
            selectedProductId: productId,
            selectedProductSlug: slug || null,
          }
          try { window.history.pushState(historyState, '', url) } catch {}
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      },
      goCheckout: () => {
        set({ view: 'checkout' })
        pushHistory('checkout', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goOrderSuccess: () => {
        set({ view: 'order-success' })
        pushHistory('order-success', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goAdmin: () => {
        set({ view: 'admin' })
        pushHistory('admin', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goProfile: () => {
        set({ view: 'profile' })
        pushHistory('profile', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goOrders: () => {
        set({ view: 'orders' })
        pushHistory('orders', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goSearch: (query) => {
        set({ view: 'search', searchQuery: query })
        pushHistory('search', null, query)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goCollection: (collectionId, slug) => {
        if (!slug) {
          set({ view: 'collection', selectedCollectionId: collectionId, selectedCollectionSlug: null })
        } else {
          set({ view: 'collection', selectedCollectionId: collectionId, selectedCollectionSlug: slug })
        }
        // Build URL using slug if available, otherwise ID
        const urlSlug = slug || collectionId
        const url = `/collection/${urlSlug}`
        const historyState: HistoryEntryState = {
          view: 'collection',
          selectedProductId: null,
          selectedCollectionId: collectionId,
          selectedCollectionSlug: slug || null,
        }
        try {
          if (typeof window !== 'undefined') {
            window.history.pushState(historyState, '', url)
            window.scrollTo({ top: 0, behavior: 'auto' })
          }
        } catch {}
      },
      setSearchOpen: (open) => set({ searchOpen: open }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      restoreFromHistory: (state) => {
        let savedScrollY = 0
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('aurora:home-scroll-y')
            savedScrollY = raw ? parseInt(raw, 10) || 0 : 0
          } catch {}
        }
        const isReturningToHome = state.view === 'home' && savedScrollY > 0
        set({
          view: state.view,
          selectedProductId: state.selectedProductId ?? null,
          selectedProductSlug: state.selectedProductSlug ?? null,
          selectedCollectionId: state.selectedCollectionId ?? null,
          selectedCollectionSlug: state.selectedCollectionSlug ?? null,
          ...(state.searchQuery !== undefined ? { searchQuery: state.searchQuery } : {}),
        })
        if (typeof window !== 'undefined') {
          if (isReturningToHome) {
            setTimeout(() => {
              window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior })
              try { sessionStorage.removeItem('aurora:home-scroll-y') } catch {}
            }, 100)
          } else {
            window.scrollTo({ top: 0 })
          }
        }
      },
    }),
    {
      name: 'aurora-ui',
      partialize: (s) => ({
        view: s.view,
        selectedProductId: s.selectedProductId,
        selectedCollectionId: s.selectedCollectionId,
        selectedProductSlug: s.selectedProductSlug,
        selectedCollectionSlug: s.selectedCollectionSlug,
      }),
    }
  )
)
