'use client'

import { useEffect } from 'react'

/**
 * VisitorTracker — invisible component that fires a tracking ping
 * on page load. Records the visit in Firestore via /api/analytics/track.
 *
 * How it works:
 * 1. On mount, check localStorage for a 'aurora:visitor-id'.
 * 2. If it doesn't exist, generate a random ID and store it.
 * 3. Send a POST to /api/analytics/track with the visitorId.
 * 4. The API records the visit in daily + lifetime stats.
 *
 * The ping fires AFTER the page renders (useEffect with no deps = runs
 * once on mount), so it doesn't affect page load performance.
 *
 * Errors are silently ignored — tracking is non-critical and should
 * never break the user's browsing experience.
 *
 * Only fires on the home view (not admin, not product pages — those
 * are navigated to within the SPA and would inflate counts).
 */
export function VisitorTracker({ shouldTrack }: { shouldTrack: boolean }) {
  useEffect(() => {
    if (!shouldTrack) return

    // Generate or retrieve visitor ID from localStorage
    let visitorId = ''
    try {
      visitorId = localStorage.getItem('aurora:visitor-id') || ''
      if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
        localStorage.setItem('aurora:visitor-id', visitorId)
      }
    } catch {
      // localStorage might be blocked (incognito, etc.) — skip tracking
      return
    }

    // Fire the tracking ping silently
    // Use sendBeacon if available (works even if the page is closing),
    // otherwise fall back to fetch.
    const payload = JSON.stringify({ visitorId })

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/track', blob)
        return
      } catch {
        // Fall through to fetch
      }
    }

    // Fallback: fetch with keepalive (survives page unload)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Silently ignore — tracking is non-critical
    })
  }, [shouldTrack])

  return null
}
