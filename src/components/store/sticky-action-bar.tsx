'use client'

import { useEffect, useState, useRef } from 'react'
import { ShoppingBag, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  qty: number
  added: boolean
  onAdd: () => void
  onBuyNow: () => void
}

/**
 * Sticky action bar — shows Add to bag + Buy now at the bottom of the screen
 * on mobile only, but ONLY when the original Buy now button has scrolled
 * up out of view. Full width, no gaps on left/right/bottom.
 *
 * Uses IntersectionObserver to detect when the inline Buy now button
 * (marked with id="inline-buy-now") leaves the viewport.
 */
export function StickyActionBar({ qty, added, onAdd, onBuyNow }: Props) {
  const [visible, setVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Find the inline Buy now button to observe
    const target = document.getElementById('inline-buy-now')
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when the inline button is NOT visible (scrolled past)
        setVisible(!entry.isIntersecting)
      },
      {
        // Trigger when the button leaves the bottom of the viewport
        threshold: 0,
        rootMargin: '0px 0px 0px 0px',
      }
    )

    observer.observe(target)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [])

  // Hide on desktop (lg and up) — only show on mobile/tablet
  // Also hide if not needed
  if (!visible) return null

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the sticky bar */}
      <div className="h-16 lg:hidden" />

      {/* Sticky bar — mobile only, full width, no gaps */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 lg:hidden',
          'flex items-stretch gap-2 p-2',
          'bg-white border-t border-pink-100 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]',
          'transition-transform duration-300'
        )}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Add to bag — flex-1 */}
        <Button
          onClick={onAdd}
          className={cn(
            'flex-1 h-12 rounded-lg text-sm font-semibold',
            added
              ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
              : 'bg-brand hover:shadow-lg text-white'
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4 mr-1.5" /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4 mr-1.5" /> Add to bag
            </>
          )}
        </Button>

        {/* Buy now — flex-1, same pink color */}
        <Button
          onClick={onBuyNow}
          className="flex-1 h-12 rounded-lg text-sm font-semibold bg-brand hover:shadow-lg text-white border border-brand"
          style={{ backgroundColor: '#f9758d' }}
        >
          Buy now
        </Button>
      </div>
    </>
  )
}
