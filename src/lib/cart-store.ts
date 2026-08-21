import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { trackAddToCart } from './meta-pixel'

export interface CartItem {
  id: string
  productId: string
  title: string
  price: number
  comparedPrice?: number
  image: string
  quantity: number
  maxStock?: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  itemCount: () => number
  subtotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      // Defensive: ensure items is ALWAYS an array, even if a corrupted
      // localStorage payload (from an older app version, manual edit, or
      // a partial write) hydrates `items` as null/undefined/object.
      // Without this guard, `subtotal()` and `itemCount()` would call
      // `.reduce` on a non-array and throw — crashing the render of any
      // component that reads the cart (notably <Checkout />), which
      // surfaces as Next.js's "Application error: a client-side
      // exception has occurred" page.
      items: [],
      isOpen: false,
      addItem: (item, quantity = 1) => {
        const items = get().items
        // Guard against a corrupted persisted state where items isn't an array
        const safeItems = Array.isArray(items) ? items : []
        const existing = safeItems.find((i) => i.productId === item.productId)
        if (existing) {
          set({
            items: safeItems.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: Math.min(i.quantity + quantity, item.maxStock ?? 99) }
                : i
            ),
            isOpen: true,
          })
        } else {
          set({ items: [...safeItems, { ...item, quantity }], isOpen: true })
        }
        // Fire AddToCart event for Meta Pixel
        trackAddToCart({
          id: item.productId,
          title: item.title,
          price: item.price,
          quantity,
        })
      },
      removeItem: (id) =>
        set((s) => ({
          items: (Array.isArray(s.items) ? s.items : []).filter((i) => i.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((s) => ({
          items: (Array.isArray(s.items) ? s.items : []).map((i) =>
            i.id === id
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock ?? 99)) }
              : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      itemCount: () => {
        const items = get().items
        return Array.isArray(items) ? items.reduce((sum, i) => sum + i.quantity, 0) : 0
      },
      subtotal: () => {
        const items = get().items
        return Array.isArray(items)
          ? items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
          : 0
      },
    }),
    {
      name: 'aurora-cart',
      // Only persist the data fields, never the action functions.
      // This prevents a class of bugs where a stale localStorage
      // payload (from before action signatures changed) replaces a
      // function with undefined, breaking the store.
      partialize: (s) => ({ items: s.items, isOpen: s.isOpen }),
      // Merge guard: if the persisted `items` isn't an array, drop it
      // and use the initial empty array. This is the fix for the
      // "Proceed to checkout" client-side exception.
      merge: (persisted, current) => {
        const p = (persisted || {}) as { items?: unknown; isOpen?: unknown }
        const safeItems = Array.isArray(p.items) ? p.items : []
        const safeIsOpen = typeof p.isOpen === 'boolean' ? p.isOpen : current.isOpen
        return { ...current, items: safeItems, isOpen: safeIsOpen }
      },
    }
  )
)
