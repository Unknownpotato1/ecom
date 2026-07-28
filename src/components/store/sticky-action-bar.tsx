'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  qty: number
  added: boolean
  onAdd: () => void
  onBuyNow: () => void
}

/**
 * Sticky action bar — slides up from the bottom of the mobile screen
 * ONLY when the inline Buy now button (id="inline-buy-now") scrolls out
 * of view. When the user scrolls back up, it slides back down.
 *
 * Design: single solid #f9758d background, two equal-width buttons with
 * only a thin white vertical divider line between them. No rounded
 * corners, no gaps — full edge-to-edge.
 *
 * Mobile only (hidden on desktop via lg:hidden).
 * Uses IntersectionObserver to track the inline Buy now button.
 *
 * When visible, adds padding-bottom to the body so the footer content
 * is never hidden behind the bar — the user can always scroll to see
 * all footer content.
 */
export function StickyActionBar({ added, onAdd, onBuyNow }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById('inline-buy-now')
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  // When visible, add padding-bottom to body so footer isn't hidden.
  // When hidden, remove it. 56px = bar height (h-14 = 3.5rem = 56px).
  useEffect(() => {
    if (visible) {
      document.body.style.paddingBottom = '56px'
    } else {
      document.body.style.paddingBottom = ''
    }
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [visible])

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 lg:hidden',
        'flex items-stretch',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{ backgroundColor: '#f9758d' }}
    >
      {/* Add to bag — left half */}
      <button
        onClick={onAdd}
        className={cn(
          'flex-1 h-14 flex items-center justify-center gap-1.5 text-white text-sm font-semibold',
          'active:bg-black/10 transition-colors'
        )}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" /> Added
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" /> Add to bag
          </>
        )}
      </button>

      {/* Thin divider line between the two buttons */}
      <div className="w-px bg-white/30 my-3" />

      {/* Buy now — right half */}
      <button
        onClick={onBuyNow}
        className={cn(
          'flex-1 h-14 flex items-center justify-center text-white text-sm font-semibold',
          'active:bg-black/10 transition-colors'
        )}
      >
        Buy now
      </button>
    </div>
  )
}
