'use client'

import { useEffect, useState, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  qty: number
  added: boolean
  onAdd: () => void
  onBuyNow: () => void
  /** When true, the product is sold out (stock === 0). The Add to bag
   *  and Buy now buttons are replaced with a single disabled "Sold Out"
   *  bar so customers can't attempt to purchase. */
  soldOut?: boolean
  /** Ref to the inline button container in the product page. The
   *  StickyActionBar uses an IntersectionObserver to watch this element.
   *  When it scrolls OUT of the viewport, the sticky bar slides up.
   *  When it scrolls back IN, the sticky bar slides down and hides. */
  inlineButtonsRef?: RefObject<HTMLDivElement | null>
}

/**
 * Sticky action bar — fixed to the bottom of the mobile screen.
 *
 * BEHAVIOR:
 *   - Hidden by default (translateY(100%)).
 *   - When the inline Add to Bag / Buy Now buttons (inlineButtonsRef)
 *     scroll OUT of the viewport, the sticky bar slides up
 *     (translateY(0)).
 *   - When the inline buttons scroll back INTO view, the sticky bar
 *     slides back down and hides.
 *   - Uses IntersectionObserver (not scroll events) for performance.
 *
 * PORTAL: Rendered via createPortal to document.body so no ancestor
 * transform (e.g. .fade-up) can trap it.
 *
 * Z-INDEX: z-40 — above content (z-10/20) but below the WhatsApp
 * button (z-99999) and cart drawer (z-50). The WhatsApp button sits
 * at bottom-right; the sticky bar spans full width at the bottom, so
 * the WhatsApp button is raised above it (74px from bottom on
 * product pages).
 *
 * SAFE AREA: padding-bottom respects safe-area-inset-bottom for iOS
 * devices with home indicators.
 *
 * Mobile only (hidden on desktop via lg:hidden).
 */
export function StickyActionBar({ added, onAdd, onBuyNow, soldOut, inlineButtonsRef }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // Only render the portal after mount on the client — document.body is
  // not available during SSR.
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  // IntersectionObserver: watch the inline buttons container. When it
  // exits the viewport, show the sticky bar. When it enters, hide it.
  useEffect(() => {
    if (!mounted || !inlineButtonsRef?.current) return

    const target = inlineButtonsRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        // entries[0].isIntersecting = true means the inline buttons
        // are visible in the viewport. When they're visible, HIDE the
        // sticky bar. When they're NOT visible (scrolled past), SHOW it.
        if (entries[0].isIntersecting) {
          setVisible(false)
        } else {
          setVisible(true)
        }
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [mounted, inlineButtonsRef])

  // Reserve space at the bottom of the page so the footer content is
  // never hidden behind the bar — but only when the bar is visible.
  // When the bar is hidden (inline buttons in view), remove the padding
  // so there's no unnecessary gap at the bottom.
  useEffect(() => {
    if (visible) {
      document.body.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)'
    } else {
      document.body.style.paddingBottom = ''
    }
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [visible])

  if (!mounted) return null

  return createPortal(
    <div
      ref={barRef}
      className={cn(
        'sticky-shimmer-bar',
        'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
        'flex items-stretch transition-transform duration-300 ease-out'
      )}
      style={{
        backgroundColor: soldOut ? '#9ca3af' : '#f9758d',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)',
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {soldOut ? (
        // Sold Out state — single full-width disabled bar.
        <div
          className={cn(
            'sticky-shimmer-content',
            'flex-1 h-14 flex items-center justify-center text-white text-sm font-semibold uppercase tracking-wide'
          )}
        >
          Sold Out
        </div>
      ) : (
        <>
          {/* Add to bag — left half */}
          <button
            onClick={onAdd}
            className={cn(
              'sticky-shimmer-content',
              'flex-1 h-14 flex items-center justify-center gap-1.5 text-white text-sm font-semibold uppercase tracking-wide',
              'active:bg-black/10 transition-colors'
            )}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              <>Add to bag</>
            )}
          </button>

          {/* Thin divider line between the two buttons */}
          <div className="sticky-shimmer-content w-px bg-white/30 my-3" />

          {/* Buy now — right half */}
          <button
            onClick={onBuyNow}
            className={cn(
              'sticky-shimmer-content',
              'flex-1 h-14 flex items-center justify-center text-white text-sm font-semibold uppercase tracking-wide',
              'active:bg-black/10 transition-colors'
            )}
          >
            Buy now
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
