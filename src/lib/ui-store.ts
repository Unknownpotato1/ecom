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

/**
 * Shape of the history entry we push into the browser's session stack
 * whenever the user navigates between views. Storing the view + product
 * id inside `history.state` lets us restore the exact UI state when the
 * user taps the browser/Android back or forward button.
 */
export interface HistoryEntryState {
  view: ViewName
  selectedProductId: string | null
  searchQuery?: string
}

/**
 * Build the URL that represents a given view. The URL is cosmetic (the
 * app is still a single-route SPA), but having distinct URLs means:
 *   - Browser back/forward buttons work
 *   - The user can refresh a product view and stay on it
 *   - Deep-link sharing is possible later
 *
 * NOTE: We deliberately DON'T use `pushState` for `home` (the root) —
 * we `replaceState` instead so we don't pile up duplicate `/` entries
 * in the history stack.
 */
function buildUrl(view: ViewName, selectedProductId: string | null, searchQuery?: string): string {
  switch (view) {
    case 'product':
      return `/product/${selectedProductId ?? ''}`
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
    case 'collection':
      return `/collection/${get().selectedCollectionId ?? ''}`
    case 'home':
    default:
      return '/'
  }
}

/**
 * Push a new history entry for the given view. Called from every
 * `goXxx` action below so the browser back button works.
 *
 * Guarded for SSR (typeof window check) — Zustand actions can fire
 * during hydration in some edge cases.
 */
function pushHistory(view: ViewName, selectedProductId: string | null, searchQuery?: string) {
  if (typeof window === 'undefined') return
  const url = buildUrl(view, selectedProductId, searchQuery)
  const state: HistoryEntryState = { view, selectedProductId, searchQuery }
  try {
    window.history.pushState(state, '', url)
  } catch {
    // pushState can throw on cross-origin or file:// — fail silently,
    // the in-memory view state has already been set by the caller.
  }
}

/**
 * Replace the current history entry (no new stack entry). Used during
 * initial hydration so the first back-tap behaves correctly.
 */
export function replaceHistory(view: ViewName, selectedProductId: string | null, searchQuery?: string) {
  if (typeof window === 'undefined') return
  const url = buildUrl(view, selectedProductId, searchQuery)
  const state: HistoryEntryState = { view, selectedProductId, searchQuery }
  try {
    window.history.replaceState(state, '', url)
  } catch {
    // Same as pushHistory — fail silently.
  }
}

interface UIState {
  view: ViewName
  selectedProductId: string | null
  selectedCollectionId: string | null
  searchQuery: string
  searchOpen: boolean
  mobileMenuOpen: boolean
  homeScrollY: number
  // navigation
  goHome: () => void
  goProduct: (productId: string) => void
  goCheckout: () => void
  goOrderSuccess: () => void
  goAdmin: () => void
  goProfile: () => void
  goOrders: () => void
  goSearch: (query: string) => void
  goCollection: (collectionId: string) => void
  setSearchOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  /**
   * Internal — called by the NavigationWatcher when the user taps the
   * browser back/forward button. Restores view state from history.state
   * WITHOUT pushing another history entry (otherwise we'd loop).
   */
  restoreFromHistory: (state: HistoryEntryState) => void
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      view: 'home',
      selectedProductId: null,
      selectedCollectionId: null,
      searchQuery: '',
      searchOpen: false,
      mobileMenuOpen: false,
      homeScrollY: 0,
      goHome: () => {
        set({ view: 'home', selectedProductId: null })
        pushHistory('home', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goProduct: (productId) => {
        // Save the current scroll position BEFORE navigating to the product
        // page, so when the user taps the browser back button to return to
        // home, we can restore the exact same scroll position.
        // We use sessionStorage (not the Zustand store) because the persist
        // middleware can re-hydrate and reset non-persisted fields like
        // homeScrollY. sessionStorage is tab-scoped and survives SPA
        // navigations within the same tab.
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('aurora:home-scroll-y', String(window.scrollY))
          } catch {
            // sessionStorage might be blocked — fail silently
          }
        }
        set({ view: 'product', selectedProductId: productId })
        pushHistory('product', productId)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
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
      goCollection: (collectionId) => {
        set({ view: 'collection', selectedCollectionId: collectionId })
        pushHistory('collection', null)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      setSearchOpen: (open) => set({ searchOpen: open }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      restoreFromHistory: (state) => {
        // Restore the in-memory view from a history entry WITHOUT
        // pushing another history entry (otherwise back button loops).
        // Check if we have a saved scroll position in sessionStorage —
        // this is more reliable than checking get().view (which may have
        // been re-hydrated by the persist middleware and already set to
        // 'home', making the isReturningToHome check unreliable).
        let savedScrollY = 0
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('aurora:home-scroll-y')
            savedScrollY = raw ? parseInt(raw, 10) || 0 : 0
          } catch {
            // sessionStorage blocked — default to 0
          }
        }
        const isReturningToHome = state.view === 'home' && savedScrollY > 0
        set({
          view: state.view,
          selectedProductId: state.selectedProductId ?? null,
          ...(state.searchQuery !== undefined ? { searchQuery: state.searchQuery } : {}),
        })
        if (typeof window !== 'undefined') {
          if (isReturningToHome) {
            // Returning to home via back button — restore the saved scroll
            // position so the user sees the exact same spot they were at.
            // Use setTimeout to allow React to re-render and un-hide the
            // Storefront before we scroll.
            setTimeout(() => {
              window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior })
              // Clear the saved scroll so a subsequent navigation doesn't
              // jump to a stale position.
              try {
                sessionStorage.removeItem('aurora:home-scroll-y')
              } catch {
                // ignore
              }
            }, 100)
          } else {
            // Navigating to a non-home view (or no saved scroll) — scroll to top.
            window.scrollTo({ top: 0 })
          }
        }
      },
    }),
    {
      name: 'aurora-ui',
      partialize: (s) => ({ view: s.view, selectedProductId: s.selectedProductId }),
    }
  )
)
