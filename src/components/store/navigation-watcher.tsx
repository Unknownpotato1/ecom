'use client'

import { useEffect } from 'react'
import { useUI, replaceHistory, type HistoryEntryState } from '@/lib/ui-store'

/**
 * NavigationWatcher — bridges browser history <-> in-app view state.
 *
 * WHY THIS EXISTS:
 * The store is a single-route Next.js SPA. All navigation between views
 * (home / product / checkout / etc.) is done by mutating Zustand state
 * — the URL bar stays on `/`. Without this watcher, tapping the
 * browser/Android back button had no in-app history entry to go back
 * to, so it exited the site entirely (back to google.com or the
 * previous tab).
 *
 * WHAT IT DOES:
 * 1. On mount, replaces the current history entry with the initial
 *    view state (so the FIRST back tap from a product view correctly
 *    returns to home instead of leaving the site).
 * 2. Listens to `popstate` — fired when the user taps back/forward.
 *    Reads the view + productId from `history.state` and restores the
 *    Zustand store via `restoreFromHistory` (which does NOT push
 *    another entry — otherwise we'd loop).
 *
 * Note: this component renders nothing. It's a side-effect only.
 * Mounted once in `app/page.tsx`.
 */
export function NavigationWatcher() {
  const view = useUI((s) => s.view)
  const selectedProductId = useUI((s) => s.selectedProductId)
  const searchQuery = useUI((s) => s.searchQuery)

  // On mount: reconcile the current view with what's in history.state.
  //
  // Two cases:
  //  (a) Fresh page load on `/` with no history.state → replace the
  //      current entry with the initial (hydrated) view, so the first
  //      back tap from a later view lands on home instead of exiting
  //      the site.
  //  (b) Deep-link load on e.g. `/product/abc` (e.g. user refreshes a
  //      product page, or shares a link) — there may be no history.state
  //      on the very first load, but the URL tells us where the user
  //      expects to be. We trust the URL over any stale persisted
  //      Zustand state in that case.
  useEffect(() => {
    const current = (window.history.state ?? null) as HistoryEntryState | null
    if (current && current.view) {
      // History state exists — sync the store to it (handles refresh
      // on a deep link where Zustand's persisted state may disagree).
      useUI.getState().restoreFromHistory(current)
    } else {
      // No history state yet — replace the current entry with the
      // current store state so future back taps work correctly.
      replaceHistory(view, selectedProductId, searchQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for browser back/forward (popstate) and restore the
  // corresponding view from history.state.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const state = (e.state ?? null) as HistoryEntryState | null
      if (state && state.view) {
        useUI.getState().restoreFromHistory(state)
      } else {
        // No state (e.g. user navigated to a hash-only URL or the
        // initial entry). Default to home.
        useUI.getState().restoreFromHistory({ view: 'home', selectedProductId: null })
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return null
}
