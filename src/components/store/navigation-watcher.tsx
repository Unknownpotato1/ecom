'use client'

import { useEffect } from 'react'
import { useUI, replaceHistory, type HistoryEntryState } from '@/lib/ui-store'

/**
 * Parse a URL path + query string into a HistoryEntryState.
 *
 * Used on a fresh page load (e.g. user refreshes /product/<id> or
 * follows a shared deep link) — at that point history.state is null,
 * so we have to reconstruct the intended view from the URL itself.
 *
 * Returns null if the path doesn't match any known SPA route, in
 * which case the caller falls back to history.state or the default
 * (home) view.
 */
function parseUrlToState(): HistoryEntryState | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  const search = window.location.search

  // /product/<id> — capture everything after /product/ as the id
  // (product ids may contain characters that need decoding)
  const productMatch = path.match(/^\/product\/(.+)$/)
  if (productMatch) {
    return {
      view: 'product',
      selectedProductId: decodeURIComponent(productMatch[1]),
    }
  }

  // /search?q=<query>
  if (path === '/search') {
    const q = new URLSearchParams(search).get('q') ?? ''
    return { view: 'search', selectedProductId: null, searchQuery: q }
  }

  // Simple named routes
  switch (path) {
    case '/':
    case '':
      return { view: 'home', selectedProductId: null }
    case '/checkout':
      return { view: 'checkout', selectedProductId: null }
    case '/order-success':
      return { view: 'order-success', selectedProductId: null }
    case '/admin':
      return { view: 'admin', selectedProductId: null }
    case '/profile':
      return { view: 'profile', selectedProductId: null }
    case '/orders':
      return { view: 'orders', selectedProductId: null }
    default:
      return null
  }
}

/**
 * NavigationWatcher — bridges browser history <-> in-app view state.
 *
 * WHY THIS EXISTS:
 * The store is a single-route Next.js SPA. All navigation between views
 * (home / product / checkout / etc.) is done by mutating Zustand state.
 * ui-store.ts pushes a real URL like /product/<id> into history on every
 * navigation so the browser back button works. The next.config.ts
 * rewrites silently forward all such URLs back to the SPA root on a
 * fresh request (refresh / deep link), so the HTML always loads — and
 * THIS component is what figures out which view to show based on the
 * URL or history.state.
 *
 * WHAT IT DOES:
 * 1. On mount, picks the source of truth in this priority order:
 *    a) The URL path (window.location.pathname) — handles refresh &
 *       deep-link cases where history.state is null but the URL tells
 *       us exactly where the user expects to be.
 *    b) history.state — handles in-app back/forward taps where the
 *       URL and state are already in sync.
 *    c) The current Zustand state (persisted from last session) — last
 *       resort fallback.
 *    Then it replaces the current history entry with the resolved
 *    state so subsequent back taps behave correctly.
 * 2. Listens to `popstate` — when the user taps back/forward, restores
 *    the Zustand store from history.state WITHOUT pushing another
 *    entry (otherwise we'd loop).
 *
 * Note: this component renders nothing. It's a side-effect only.
 * Mounted once in `app/page.tsx`.
 */
export function NavigationWatcher() {
  const view = useUI((s) => s.view)
  const selectedProductId = useUI((s) => s.selectedProductId)
  const searchQuery = useUI((s) => s.searchQuery)

  // On mount: reconcile the current view with the URL / history.state.
  useEffect(() => {
    // Priority 1: parse the URL. This is the ONLY reliable signal on a
    // fresh page load (refresh / deep link) where history.state is null.
    const fromUrl = parseUrlToState()
    if (fromUrl) {
      useUI.getState().restoreFromHistory(fromUrl)
      // Sync history.state to match the URL (replaceState, not pushState,
      // so we don't add a duplicate entry to the stack).
      replaceHistory(fromUrl.view, fromUrl.selectedProductId, fromUrl.searchQuery)
      return
    }

    // Priority 2: history.state. Present after in-app navigations where
    // ui-store.ts already pushed state.
    const current = (window.history.state ?? null) as HistoryEntryState | null
    if (current && current.view) {
      useUI.getState().restoreFromHistory(current)
      return
    }

    // Priority 3: fall back to whatever Zustand has (persisted from
    // last session) and sync history to match.
    replaceHistory(view, selectedProductId, searchQuery)
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
        // No state — fall back to parsing the URL (some browsers fire
        // popstate with null state on hash-only navigations).
        const fromUrl = parseUrlToState()
        if (fromUrl) {
          useUI.getState().restoreFromHistory(fromUrl)
        } else {
          useUI.getState().restoreFromHistory({ view: 'home', selectedProductId: null })
        }
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return null
}
