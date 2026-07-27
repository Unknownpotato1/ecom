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

interface UIState {
  view: ViewName
  selectedProductId: string | null
  searchQuery: string
  searchOpen: boolean
  mobileMenuOpen: boolean
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
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      view: 'home',
      selectedProductId: null,
      searchQuery: '',
      searchOpen: false,
      mobileMenuOpen: false,
      goHome: () => {
        set({ view: 'home', selectedProductId: null })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goProduct: (productId) => {
        set({ view: 'product', selectedProductId: productId })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goCheckout: () => {
        set({ view: 'checkout' })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goOrderSuccess: () => {
        set({ view: 'order-success' })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goAdmin: () => {
        set({ view: 'admin' })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goProfile: () => set({ view: 'profile' }),
      goOrders: () => {
        set({ view: 'orders' })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      goSearch: (query) => {
        set({ view: 'search', searchQuery: query })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      setSearchOpen: (open) => set({ searchOpen: open }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'aurora-ui',
      partialize: (s) => ({ view: s.view, selectedProductId: s.selectedProductId }),
    }
  )
)
