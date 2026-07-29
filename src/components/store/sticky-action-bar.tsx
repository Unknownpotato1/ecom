'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  qty: number
  added: boolean
  onAdd: () => void
  onBuyNow: () => void
}

/**
 * Sticky action bar — always pinned to the bottom of the mobile screen,
 * like many e-commerce apps (Myntra, Amazon, Flipkart) use.
 *
 * ⚠️ ROOT CAUSE NOTE (why previous attempts failed):
 * The product page wraps everything in `<div className="fade-up">` whose
 * CSS animation `aurora-fade-up` uses `animation-fill-mode: both`. That
 * leaves `transform: translateY(0)` permanently applied to the ancestor.
 * Per the CSS spec, ANY ancestor with a non-`none` `transform` becomes
 * the containing block for `position: fixed` descendants — so a plain
 * `fixed bottom-0` bar was being trapped inside the `.fade-up` div and
 * behaved like `absolute`, sticking to the bottom of the product content
 * (right above the footer) instead of the viewport.
 *
 * ✅ FIX: Render the bar through `createPortal(…, document.body)` so it
 * is a direct child of <body>. No ancestor can capture it, regardless of
 * where ProductDetail is mounted in the React tree. Same trick the
 * CartDrawer / Sheet components use, and the same reason the Header
 * (which sits directly under <main>) already sticks correctly.
 *
 * Design: single solid #f9758d background, two equal-width buttons with
 * only a thin white vertical divider line between them. No rounded
 * corners, no gaps — full edge-to-edge.
 *
 * Mobile only (hidden on desktop via lg:hidden).
 *
 * Always visible — adds persistent padding-bottom to the body so the
 * footer content is never hidden behind the bar. 56px = bar height
 * (h-14 = 3.5rem = 56px).
 *
 * Text on both buttons is rendered in ALL CAPS per spec.
 * Bag icon is removed from the Add to bag button (the Check icon for
 * the "Added" state is kept for clarity).
 */
export function StickyActionBar({ added, onAdd, onBuyNow }: Props) {
  const [mounted, setMounted] = useState(false)

  // Only render the portal after mount on the client — document.body is
  // not available during SSR.
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  // Always reserve space at the bottom of the page so the footer (and
  // any other trailing content) is never hidden behind the sticky bar.
  // 56px = bar height (h-14 = 3.5rem = 56px).
  useEffect(() => {
    document.body.style.paddingBottom = '56px'
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 lg:hidden',
        'flex items-stretch'
      )}
      style={{ backgroundColor: '#f9758d' }}
    >
      {/* Add to bag — left half (no bag icon, text only) */}
      <button
        onClick={onAdd}
        className={cn(
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
      <div className="w-px bg-white/30 my-3" />

      {/* Buy now — right half */}
      <button
        onClick={onBuyNow}
        className={cn(
          'flex-1 h-14 flex items-center justify-center text-white text-sm font-semibold uppercase tracking-wide',
          'active:bg-black/10 transition-colors'
        )}
      >
        Buy now
      </button>
    </div>,
    document.body
  )
}
