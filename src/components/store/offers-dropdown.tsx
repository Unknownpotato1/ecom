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
    <div className="w-full mt-1" style={{ backgroundColor: '#f9758d', borderRadius: 0 }}>
      {/* Header bar — clickable to toggle the dropdown.
          Full-width brand-pink bar with sparkles icon + white "Get it for ₹XX"
          text on the left, dropdown chevron on the right. Matches the
          "Get it for" treatment on product cards for consistency. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-white"
        style={{ padding: '8px 12px' }}
        aria-expanded={open}
        aria-controls="offers-dropdown-content"
      >
        {/* Left side: sparkles icon + "Get it for ₹XXX" — all white on pink */}
        <span className="flex items-center gap-1.5">
          <svg
            className="h-5 w-5 shrink-0"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.891 15.107 15.11 8.89m-5.183-.52h.01m3.089 7.254h.01M14.08 3.902a2.849 2.849 0 0 0 2.176.902 2.845 2.845 0 0 1 2.94 2.94 2.849 2.849 0 0 0 .901 2.176 2.847 2.847 0 0 1 0 4.16 2.848 2.848 0 0 0-.901 2.175 2.843 2.843 0 0 1-2.94 2.94 2.848 2.848 0 0 0-2.176.902 2.847 2.847 0 0 1-4.16 0 2.85 2.85 0 0 0-2.176-.902 2.845 2.845 0 0 1-2.94-2.94 2.848 2.848 0 0 0-.901-2.176 2.848 2.848 0 0 1 0-4.16 2.849 2.849 0 0 0 .901-2.176 2.845 2.845 0 0 1 2.941-2.94 2.849 2.849 0 0 0 2.176-.901 2.847 2.847 0 0 1 4.159 0Z"
            />
          </svg>
          <span className="text-base sm:text-lg" style={{ fontWeight: 400 }}>
            Get it for
          </span>
          <span className="text-lg sm:text-xl font-extrabold">
            {formatPrice(getItForPrice)}
          </span>
        </span>

        {/* Right side: minimal dropdown arrow */}
        <span className="flex items-center">
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
