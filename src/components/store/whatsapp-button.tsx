'use client'

import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'

/**
 * Floating WhatsApp button — fixed to the bottom-right corner.
 *
 * Visibility rules:
 *   1. Hidden when the cart drawer is open (would overlap the drawer).
 *   2. Hidden on the checkout page (focused purchase flow — no distractions).
 *   3. On the product page, raised above the sticky Add-to-bag / Buy-now bar
 *      (which is 56px tall and pinned to the bottom) so it doesn't cover the
 *      Buy now button. On all other pages it sits at the default 18px from
 *      the bottom.
 *
 * The button links to https://wa.me/917780022167 (opens WhatsApp in a new
 * tab). Uses the official WhatsApp green (#25D366) and the WhatsApp glyph
 * SVG.
 */
export default function WhatsAppButton() {
  const cartOpen = useCart((s) => s.isOpen)
  const view = useUI((s) => s.view)

  // Hide on checkout page and when cart drawer is open
  if (view === 'checkout' || cartOpen) return null

  // On the product page, the sticky action bar (Add to bag / Buy now) is
  // 56px tall and pinned to the bottom of the viewport. Raise the WhatsApp
  // button above it (56px bar + 18px gap = 74px from bottom) so it doesn't
  // cover the Buy now button. On all other pages, use the default 18px.
  const bottomOffset = view === 'product' ? '74px' : '18px'

  return (
    <a
      href="https://wa.me/917780022167"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-[18px] z-[99999] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] shadow-[0_4px_14px_rgba(0,0,0,0.22)] transition-all duration-200 hover:scale-[1.08] hover:shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
      style={{ bottom: bottomOffset }}
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[27px] w-[27px] fill-white"
        aria-hidden="true"
      >
        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.55 1.74 6.54L3 29l6.62-1.7A12.94 12.94 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Zm0 23.6c-2.03 0-4.02-.55-5.75-1.6l-.41-.25-3.93 1.01 1.05-3.83-.27-.42A10.6 10.6 0 1 1 16 26.6Zm5.82-7.95c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.86-1.61-1.91-1.8-2.23-.19-.33-.02-.5.14-.66.14-.14.32-.38.48-.57.16-.19.22-.33.32-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.13 1.33 3.35.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.9-.78 2.17-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z" />
      </svg>
    </a>
  )
}
