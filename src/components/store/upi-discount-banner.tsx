'use client'

import { formatPrice } from '@/lib/types'

interface Props {
  /** The product's current selling price. 10% is deducted from this. */
  price: number
}

/**
 * UPI Discount Banner — shown directly below the product price.
 *
 * Design (based on the user's reference image):
 *   ┌──────────────────────────────────────────────────────┐
 *   │  ✦%   Get it for ₹1,506                    [UPI logo]│
 *   └──────────────────────────────────────────────────────┘
 *   - Light mint green background (#E8F5E9)
 *   - Left: a starburst/seal icon with "%" inside, followed by
 *     "Get it for ₹XXX" in vibrant green
 *   - Right: the UPI logo (NPCI's official UPI mark)
 *   - Sharp corners (no border radius), no shadows, flat design
 *
 * The discounted price = round(price * 0.9) — i.e. 10% off the
 * product's current selling price. This is a UPI-payment offer
 * (hence the UPI logo on the right).
 *
 * Rendered only when price > 0.
 */
export function UpiDiscountBanner({ price }: Props) {
  if (!price || price <= 0) return null

  // 10% off, rounded to the nearest rupee (Indian pricing convention
  // rarely uses paise, and rounding down avoids "₹149.90" ugliness).
  const discountedPrice = Math.floor(price * 0.9)

  return (
    <div
      className="flex items-center justify-between w-full mt-3"
      style={{
        backgroundColor: '#E8F5E9',
        padding: '16px 20px',
      }}
    >
      {/* Left side: starburst % icon + "Get it for ₹XXX" */}
      <div className="flex items-center gap-3">
        {/* Starburst / seal badge with % inside — matches the reference design */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Starburst shape — 12-pointed scalloped seal */}
          <path
            d="M18 2 L21 6 L26 4 L25 9 L30 11 L26 14 L29 19 L24 19 L24 24 L19 21 L18 26 L17 21 L12 24 L12 19 L7 19 L10 14 L6 11 L11 9 L10 4 L15 6 Z"
            fill="#1B8A3A"
          />
          {/* % symbol in white inside the seal */}
          <text
            x="18"
            y="22"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="white"
            fontFamily="Arial, sans-serif"
          >
            %
          </text>
        </svg>
        <span
          className="text-xl sm:text-2xl font-semibold"
          style={{ color: '#1B8A3A' }}
        >
          Get it for {formatPrice(discountedPrice)}
        </span>
      </div>

      {/* Right side: UPI logo */}
      <div className="flex items-center shrink-0">
        <UpiLogo />
      </div>
    </div>
  )
}

/**
 * Inline SVG of the UPI (Unified Payments Interface) logo by NPCI.
 *
 * The official UPI mark consists of:
 *  - A green teardrop/half-circle on the left (the "U" shape)
 *  - A green right-pointing triangle (play arrow) merging into the text
 *  - "UPI" in bold green letters
 *
 * Using an inline SVG (instead of an <img>) means:
 *  - No external network dependency (always renders, even offline)
 *  - No CDN/account required
 *  - Crisp at any size
 *  - Colors are fixed and consistent
 *
 * Approximate dimensions: 56×24 (matches the proportions of the real
 * UPI logo as seen on payment screens).
 */
function UpiLogo() {
  return (
    <svg
      width="56"
      height="24"
      viewBox="0 0 56 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="UPI"
      role="img"
    >
      {/* Left teardrop / half-circle — the iconic UPI swoosh */}
      <path
        d="M12 2 C6 2 2 6 2 12 C2 18 6 22 12 22 C14 22 16 21 17 20 C13 18 10 15 10 12 C10 9 13 6 17 4 C16 3 14 2 12 2 Z"
        fill="#097D38"
      />
      {/* Right-pointing triangle (play arrow) — part of the UPI mark */}
      <path
        d="M17 4 C21 6 24 9 24 12 C24 15 21 18 17 20 L20 12 Z"
        fill="#5FCE85"
      />
      {/* "UPI" text in bold green */}
      <text
        x="28"
        y="17"
        fontSize="13"
        fontWeight="800"
        fill="#097D38"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.5"
      >
        UPI
      </text>
    </svg>
  )
}
