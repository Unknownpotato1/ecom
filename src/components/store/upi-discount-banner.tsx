'use client'

import { formatPrice } from '@/lib/types'

interface Props {
  /** The product's current selling price. 10% is deducted from this. */
  price: number
}

/**
 * UPI Discount Banner — shown directly below the product price.
 *
 * Clean, minimal, professional design:
 *   ┌────────────────────────────────────────────┐
 *   │  Get it for ₹449                    [UPI®] │
 *   └────────────────────────────────────────────┘
 *
 *   - Light mint green background (#E8F5E9)
 *   - Left: "Get it for" (weight 400) + "₹XXX" (weight 500, slightly
 *     larger) in the original price color (#5bb450)
 *   - Right: official UPI logo (NPCI mark, local SVG file)
 *   - Minimal padding (8px 12px)
 *   - Tight top margin (mt-1 = 4px) to reduce empty space between
 *     the price row and this banner
 *   - No icons, no badges, no shadows, sharp corners
 *
 * The discounted price = floor(price * 0.9) — i.e. 10% off the
 * product's current selling price. This is a UPI-payment offer
 * (hence the UPI logo on the right).
 *
 * Rendered only when price > 0.
 */
export function UpiDiscountBanner({ price }: Props) {
  if (!price || price <= 0) return null

  // 10% off, rounded down to the nearest rupee (Indian pricing
  // convention rarely uses paise).
  const discountedPrice = Math.floor(price * 0.9)

  // Original price color — matches the .text-price class (#5bb450)
  // so the UPI price reads as the same "brand green" as the main price.
  const PRICE_COLOR = '#5bb450'

  return (
    <div
      className="flex items-center justify-between w-full mt-1"
      style={{
        backgroundColor: '#E8F5E9',
        padding: '8px 12px',
      }}
    >
      {/*
        Left side: "Get it for ₹XXX"
        - "Get it for" — font-weight 400 (normal)
        - "₹XXX" — font-weight 500 (medium), slightly larger font size
        Both use the original price color (#5bb450) per user request.
      */}
      <span
        className="flex items-baseline gap-1.5"
        style={{ color: PRICE_COLOR }}
      >
        <span className="text-base sm:text-lg" style={{ fontWeight: 400 }}>
          Get it for
        </span>
        <span className="text-lg sm:text-xl" style={{ fontWeight: 500 }}>
          {formatPrice(discountedPrice)}
        </span>
      </span>

      {/* Right side: official UPI logo */}
      <div className="flex items-center shrink-0">
        <UpiLogo />
      </div>
    </div>
  )
}

/**
 * Official UPI (Unified Payments Interface) logo by NPCI.
 *
 * Source: https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg
 * Hosted locally at /upi-logo.svg (in the /public folder) to avoid
 * any external network dependency and CDN issues.
 *
 * Using a local <img> tag because the official SVG uses complex nested
 * transforms that are error-prone to inline. The local file is the
 * exact official SVG from Wikimedia, served from our own domain.
 *
 * Rendered at height 18px (width auto-scales to ~51px based on the
 * logo's 2.83:1 aspect ratio).
 */
function UpiLogo() {
  return (
    <img
      src="/upi-logo.svg"
      alt="UPI"
      height={18}
      style={{ display: 'block', height: '18px', width: 'auto' }}
      loading="eager"
      referrerPolicy="no-referrer"
    />
  )
}

