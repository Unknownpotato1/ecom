'use client'

import { useEffect, useState, useRef, type ReactNode } from 'react'

interface StickyHeaderProps {
  /** The countdown/announcement custom section(s) to pin at the very top */
  countdownSlot?: ReactNode
  /** The Header component */
  children: ReactNode
}

/**
 * StickyHeader — manages the sticky countdown + dynamic header behavior.
 *
 * Layout (top to bottom):
 *   ┌─────────────────────────┐
 *   │  Countdown (sticky top-0)│  ← Always pinned at the very top
 *   ├─────────────────────────┤
 *   │  Header (dynamic)        │  ← Slides in on scroll up, hides on scroll down
 *   └─────────────────────────┘
 *
 * Behavior:
 * - The countdown is always sticky at top:0 (never moves)
 * - The header sits right below the countdown
 * - When scrolling DOWN: the header slides up and disappears (scrolls away)
 * - When scrolling UP (from anywhere): the header slides back in immediately
 * - The header appears BELOW the countdown (not overlapping it)
 *
 * Implementation:
 * - Countdown: position: sticky; top: 0; z-index: 50
 * - Header: position: sticky; top: <countdown-height>; z-index: 40
 *   When hidden: translateY(-100%) to slide it up out of view
 *   When visible: translateY(0) to slide it back down
 *
 * The countdown height is measured dynamically via a ref so the header
 * slides in at exactly the right position (right below the countdown).
 */
export function StickyHeader({ countdownSlot, children }: StickyHeaderProps) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const [countdownHeight, setCountdownHeight] = useState(0)
  const countdownRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Measure the countdown height so the header's sticky top offset
  // matches exactly (header sits right below the countdown).
  // Uses both ResizeObserver AND a polling interval because the
  // countdown content (HomeCustomSlot) loads asynchronously — the
  // ref is attached immediately but the content inside it appears
  // later after the API fetch completes. ResizeObserver catches most
  // changes, but the interval ensures we catch the initial load too.
  //
  // IMPORTANT: This effect re-runs whenever `countdownSlot` changes
  // (e.g. navigating from home → checkout where the slot goes from
  // <HomeCustomSlot> to null). Without re-running, the old
  // countdownHeight value would persist after navigation, leaving
  // empty space above the header on the new view until a page refresh.
  // When countdownSlot becomes null, the ref div unmounts and we
  // reset countdownHeight to 0 so the header sits at top:0.
  useEffect(() => {
    // If there's no countdown slot at all, there's nothing to measure
    // — the ref div isn't rendered. The header's top offset is derived
    // from countdownSlot in the render below (top: countdownSlot ?
    // `${countdownHeight}px` : '0px'), so stale countdownHeight state
    // can't cause empty space on views without a countdown.
    if (!countdownSlot || !countdownRef.current) {
      return
    }

    const measure = () => {
      if (countdownRef.current) {
        const h = countdownRef.current.offsetHeight
        setCountdownHeight((prev) => (prev === h ? prev : h))
      }
    }

    // Measure immediately
    measure()

    // Poll for the first 3 seconds (covers async content loading)
    const pollInterval = setInterval(measure, 300)
    const pollTimeout = setTimeout(() => clearInterval(pollInterval), 3000)

    // Also use ResizeObserver for ongoing changes
    const ro = new ResizeObserver(measure)
    ro.observe(countdownRef.current)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(pollTimeout)
      ro.disconnect()
    }
  }, [countdownSlot])

  // Scroll detection: show header on scroll up, hide on scroll down.
  // Triggers on ANY scroll up — even 1px — so the header immediately
  // slides back in the moment the user scrolls up from anywhere.
  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return
      ticking.current = true

      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const diff = currentY - lastScrollY.current

        // Even 1px of scroll up should show the header.
        // Only ignore 0px (no actual scroll movement).
        if (diff === 0) {
          ticking.current = false
          return
        }

        if (diff > 0) {
          // Scrolling DOWN → hide header
          setHeaderVisible(false)
        } else {
          // Scrolling UP (even 1px) → show header immediately
          setHeaderVisible(true)
        }

        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Countdown — always sticky at the very top.
          z-50 so it stays above the header.
          If there's no countdown slot, this renders nothing and the
          header effectively sits at top:0. */}
      {countdownSlot && (
        <div
          ref={countdownRef}
          className="sticky top-0 z-50"
        >
          {countdownSlot}
        </div>
      )}

      {/* Header — dynamic sticky.
          - position: sticky so it participates in normal flow
          - top: countdownHeight so it sticks right below the countdown.
            When there's no countdownSlot (e.g. checkout, about, orders),
            top is '0px' regardless of stale countdownHeight state —
            this prevents empty space above the header after navigating
            from a view with a countdown to one without.
          - When headerVisible: translateY(0) — normal position
          - When !headerVisible: translateY(-100%) — slides up out of view
          - transition for smooth slide animation
          - z-40 (below countdown's z-50)
          
          Note: Using inline style for transform instead of Tailwind's
          -translate-y-full class because Tailwind v4 uses CSS custom
          properties for transforms which don't combine well with
          position:sticky in some browsers. Inline style is more reliable. */}
      <div
        className="sticky z-40 transition-transform duration-300 ease-out"
        style={{
          top: countdownSlot ? `${countdownHeight}px` : '0px',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
        {children}
      </div>
    </>
  )
}
