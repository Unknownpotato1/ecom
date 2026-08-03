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
  searchQuery: string
  searchOpen: boolean
  mobileMenuOpen: boolean
  /**
   * Saved vertical scroll position of the home page, captured when the
   * user navigates away from home (e.g. to a product page). When the
   * user navigates back to home via the browser back button, this
   * position is restored so the user sees the exact same scroll
   * position they were at — no jarring jump to the top.
   */
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
        const currentScroll = typeof window !== 'undefined' ? window.scrollY : 0
        set({ view: 'product', selectedProductId: productId, homeScrollY: currentScroll })
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
      setSearchOpen: (open) => set({ searchOpen: open }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      restoreFromHistory: (state) => {
        // Restore the in-memory view from a history entry WITHOUT
        // pushing another history entry (otherwise back button loops).
        const isReturningToHome = state.view === 'home' && get().view !== 'home'
        const savedScrollY = get().homeScrollY
        set({
          view: state.view,
          selectedProductId: state.selectedProductId ?? null,
          ...(state.searchQuery !== undefined ? { searchQuery: state.searchQuery } : {}),
        })
        if (typeof window !== 'undefined') {
          if (isReturningToHome && savedScrollY > 0) {
            // Returning to home via back button — restore the saved scroll
            // position so the user sees the exact same spot they were at.
            // Use setTimeout (not rAF) because React needs time to:
            //   1. Re-render (remove 'hidden' class from Storefront wrapper)
            //   2. Browser needs to lay out the now-visible Storefront
            //   3. Page needs scrollable height before scrollTo works
            // A 50ms delay is enough for all of this without being noticeable.
            setTimeout(() => {
              window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior })
            }, 50)
          } else {
            // Navigating to a non-home view (or forward to home) — scroll to top.
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
