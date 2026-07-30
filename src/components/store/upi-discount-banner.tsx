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
 *   - Left: "Get it for ₹XXX" in normal weight (400), muted green
 *   - Right: official UPI logo (NPCI mark, inline SVG from Wikimedia)
 *   - Minimal padding (8px 12px)
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

  return (
    <div
      className="flex items-center justify-between w-full mt-2"
      style={{
        backgroundColor: '#E8F5E9',
        padding: '8px 12px',
      }}
    >
      {/* Left side: "Get it for ₹XXX" — normal weight, muted green */}
      <span
        className="text-base sm:text-lg"
        style={{
          color: '#1B8A3A',
          fontWeight: 400,
        }}
      >
        Get it for {formatPrice(discountedPrice)}
      </span>

      {/* Right side: official UPI logo (inline SVG) */}
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
 * The logo consists of:
 *  - Two interlocking chevron/arrow shapes (green #27803b + orange #e9661c)
 *    forming the "U" mark on the left
 *  - "UPI" wordmark in grey (#696a6a) on the right
 *
 * Using a local <img> tag (not inline SVG) because the official SVG
 * uses complex nested transforms that are error-prone to inline.
 * The local file is the exact official SVG from Wikimedia, served
 * from our own domain.
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
      // width is auto — the SVG's intrinsic aspect ratio (2.83:1)
      // gives ~51px at 18px height. Don't set width to avoid distortion.
      style={{ display: 'block', height: '18px', width: 'auto' }}
      // loading="eager" — this is above the fold on product pages,
      // so we want it immediately (not lazily loaded).
      loading="eager"
      // No referrer needed for a same-origin static asset.
      referrerPolicy="no-referrer"
    />
  )
}
