'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Tag, Wallet } from 'lucide-react'
import { formatPrice } from '@/lib/types'

interface Props {
  /** The product's current selling price. 20% is deducted for the "Get it for" price. */
  price: number
}

/**
 * Offers Dropdown — replaces the old UpiDiscountBanner on the product page.
 *
 * Collapsed state:
 *   ┌────────────────────────────────────────────┐
 *   │  Get it for ₹449                      ▾    │
 *   └────────────────────────────────────────────┘
 *   - Light mint green background (#E8F5E9)
 *   - Left: "Get it for ₹XXX" where XXX = 20% off the selling price
 *   - Right: minimal dropdown arrow (chevron) — no UPI icon
 *
 * Expanded state (clicking the bar toggles it):
 *   ┌────────────────────────────────────────────┐
 *   │  Get it for ₹449                      ▴    │
 *   ├────────────────────────────────────────────┤
 *   │  🏷️ USE PROMO CODE (WELCOME10) AT CHECKOUT │
 *   │     10% OFF                                 │
 *   ├────────────────────────────────────────────┤
 *   │  💳 PAY ONLINE VIA ANY UPI AND GET 10% OFF  │
 *   └────────────────────────────────────────────┘
 *
 * The 20% "Get it for" price = floor(price * 0.8). This is a combined
 * discount figure (promo code 10% + UPI prepaid 10% = 20% total) shown
 * as the headline. The dropdown explains the two ways to get discounts.
 *
 * Rendered only when price > 0.
 */
export function OffersDropdown({ price }: Props) {
  const [open, setOpen] = useState(false)

  if (!price || price <= 0) return null

  // 20% off, rounded down to the nearest rupee.
  const getItForPrice = Math.floor(price * 0.8)

  // Original price color — matches the .text-price class (#5bb450)
  const PRICE_COLOR = '#5bb450'

  return (
    <div className="w-full mt-1" style={{ backgroundColor: '#E8F5E9' }}>
      {/* Header bar — clickable to toggle the dropdown */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
        style={{ padding: '8px 12px' }}
        aria-expanded={open}
        aria-controls="offers-dropdown-content"
      >
        {/* Left side: "Get it for ₹XXX" */}
        <span
          className="flex items-baseline gap-1.5"
          style={{ color: PRICE_COLOR }}
        >
          <span className="text-base sm:text-lg" style={{ fontWeight: 400 }}>
            Get it for
          </span>
          <span className="text-lg sm:text-xl" style={{ fontWeight: 500 }}>
            {formatPrice(getItForPrice)}
          </span>
        </span>

        {/* Right side: minimal dropdown arrow (no UPI icon) */}
        <span style={{ color: PRICE_COLOR }} className="flex items-center">
          {open ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </span>
      </button>

      {/* Dropdown content — two offers. Rendered when open. */}
      {open && (
        <div id="offers-dropdown-content" className="border-t" style={{ borderColor: 'rgba(91, 180, 80, 0.2)' }}>
          {/* Offer 1: Promo code WELCOME10 */}
          <div className="flex items-start gap-2.5" style={{ padding: '10px 12px' }}>
            <Tag className="h-4 w-4 shrink-0 mt-0.5" style={{ color: PRICE_COLOR }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                USE PROMO CODE (WELCOME10) AT CHECKOUT
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                10% OFF
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'rgba(91, 180, 80, 0.2)' }} />

          {/* Offer 2: Pay online via UPI */}
          <div className="flex items-start gap-2.5" style={{ padding: '10px 12px' }}>
            <Wallet className="h-4 w-4 shrink-0 mt-0.5" style={{ color: PRICE_COLOR }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                PAY ONLINE VIA ANY UPI AND GET 10% OFF
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
