'use client'

import { X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { BagIcon } from './bag-icon'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/types'

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCart()
  const { goCheckout, goHome } = useUI()
  const total = subtotal()

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : closeCart())}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-pink-100 flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <BagIcon className="h-5 w-5 text-brand" />
            Your Bag ({items.length})
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={closeCart} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-soft flex items-center justify-center">
              <BagIcon className="h-8 w-8 text-brand" />
            </div>
            <div>
              <p className="font-medium">Your bag is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Discover our hand-picked hampers and treat someone you love.
              </p>
            </div>
            <Button
              className="bg-brand hover:shadow-lg text-white"
              onClick={() => {
                goHome()
                closeCart()
              }}
            >
              Start shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto fancy-scroll p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 rounded-lg border border-pink-100 bg-card">
                  <div className="h-20 w-20 rounded-md overflow-hidden bg-pink-50 shrink-0">
                    {item.image && (
                       
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-price">{formatPrice(item.price)}</span>
                      {item.comparedPrice && (
                        <span className="text-xs text-compared-price line-through">
                          {formatPrice(item.comparedPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center rounded-md border border-pink-100">
                        <button
                          className="h-7 w-7 inline-flex items-center justify-center hover:bg-brand-soft"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="h-7 min-w-[2rem] inline-flex items-center justify-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          className="h-7 w-7 inline-flex items-center justify-center hover:bg-brand-soft"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-destructive text-xs inline-flex items-center gap-1"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SheetFooter className="p-4 border-t border-pink-100 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-price">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-emerald-600 font-medium">Calculated at checkout</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-price">{formatPrice(total)}</span>
                </div>
              </div>
              <Button
                className="w-full h-11 bg-brand hover:shadow-lg text-white"
                onClick={() => {
                  // Navigate FIRST, then close the cart drawer.
                  // If we close first, the Sheet's exit animation unmounts
                  // the button before goCheckout() can execute.
                  goCheckout()
                  closeCart()
                }}
              >
                Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
