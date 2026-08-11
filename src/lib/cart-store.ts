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
      items: [],
      isOpen: false,
      addItem: (item, quantity = 1) => {
        const items = get().items
        const existing = items.find((i) => i.productId === item.productId)
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: Math.min(i.quantity + quantity, item.maxStock ?? 99) }
                : i
            ),
            isOpen: true,
          })
        } else {
          set({ items: [...items, { ...item, quantity }], isOpen: true })
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
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock ?? 99)) }
              : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'aurora-cart' }
  )
)
