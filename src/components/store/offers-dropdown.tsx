'use client'

import { useState } from 'react'
import { ChevronDown, Tag, Wallet } from 'lucide-react'
import { formatPrice } from '@/lib/types'

interface Props {
  /** The product's current selling price. 20% is deducted for the "Get it for" price. */
  price: number
}

/**
 * Offers Dropdown — product page only (not on product cards).
 *
 * Collapsed state:
 *   ┌────────────────────────────────────────────┐
 *   │  ✨ Get it for ₹449                    ▾    │
 *   └────────────────────────────────────────────┘
 *   - Full-width brand-pink (#f9758d) bar, 0 radius
 *   - White sparkles icon + "Get it for ₹XXX" (20% off) on the left
 *   - White dropdown chevron on the right
 *
 * Expanded state (smooth grid-rows animation):
 *   ┌────────────────────────────────────────────┐
 *   │  ✨ Get it for ₹449                    ▾    │
 *   ├────────────────────────────────────────────┤  ← white divider
 *   │  🏷️ Apply code WELCOME10 at checkout       │  ← white text + icon
 *   │     Save 10% on your order                  │
 *   ├────────────────────────────────────────────┤  ← white divider
 *   │  💳 Pay online via UPI — extra 10% off     │  ← white text + icon
 *   └────────────────────────────────────────────┘
 *
 * All text, icons, and dividers in the expanded section are white
 * (sitting on the pink background) for a clean, premium look.
 *
 * The dropdown uses the CSS grid-template-rows 0fr → 1fr animation
 * trick for a very smooth height transition — the content is always
 * rendered, just clipped to 0 height when collapsed. This animates
 * the actual content height smoothly regardless of how much text is
 * inside, with no JS measurement needed.
 *
 * The 20% "Get it for" price = floor(price * 0.8). This is a combined
 * discount figure (promo code 10% + UPI prepaid 10% = 20% total).
 *
 * Rendered only when price > 0.
 */
export function OffersDropdown({ price }: Props) {
  const [open, setOpen] = useState(false)

  if (!price || price <= 0) return null

  // 20% off, rounded down to the nearest rupee.
  const getItForPrice = Math.floor(price * 0.8)

  return (
    <div className="w-full mt-1" style={{ backgroundColor: '#f9758d', borderRadius: 0 }}>
      {/* Header bar — clickable to toggle the dropdown.
          Full-width brand-pink bar with sparkles icon + white "Get it for ₹XX"
          text on the left, dropdown chevron on the right. */}
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

        {/* Right side: dropdown chevron — rotates smoothly on toggle.
            Using a single ChevronDown that rotates 180deg when open,
            instead of swapping between two icons, for a smoother
            animation. */}
        <span className="flex items-center transition-transform duration-300 ease-out" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>

      {/*
        Dropdown content — two offers.
        Smooth height animation via CSS grid-template-rows 0fr → 1fr.
        The outer div is always rendered (not conditionally mounted)
        so the transition can animate. When closed, gridTemplateRows is
        '0fr' which collapses the inner overflow-hidden div to 0 height.
        When open, '1fr' expands it to natural content height. The
        transition on grid-template-rows produces a very smooth slide.
        300ms ease-out matches the chevron rotation for a cohesive feel.
      */}
      <div
        id="offers-dropdown-content"
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {/* Top divider — white, semi-transparent so it's visible on pink */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.35)' }} />

          {/* Offer 1: Promo code WELCOME10 */}
          <div className="flex items-start gap-2.5 text-white" style={{ padding: '10px 12px' }}>
            <Tag className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold">
                Apply code WELCOME10 at checkout
              </p>
              <p className="text-[11px] sm:text-xs mt-0.5" style={{ opacity: 0.85 }}>
                Save 10% on your order
              </p>
            </div>
          </div>

          {/* Middle divider — white, semi-transparent */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.35)' }} />

          {/* Offer 2: Pay online via UPI */}
          <div className="flex items-start gap-2.5 text-white" style={{ padding: '10px 12px' }}>
            <Wallet className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold">
                Pay online via UPI
              </p>
              <p className="text-[11px] sm:text-xs mt-0.5" style={{ opacity: 0.85 }}>
                Enjoy an extra 10% off your purchase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
