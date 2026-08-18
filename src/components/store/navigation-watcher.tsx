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
  const productMatch = path.match(/^\/product\/(.+)$/)
  if (productMatch) {
    return {
      view: 'product',
      selectedProductId: decodeURIComponent(productMatch[1]),
    }
  }

  // /collection/<id> — capture everything after /collection/ as the id
  const collectionMatch = path.match(/^\/collection\/(.+)$/)
  if (collectionMatch) {
    return {
      view: 'collection',
      selectedProductId: null,
      selectedCollectionId: decodeURIComponent(collectionMatch[1]),
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

  // On mount: disable the browser's native scroll restoration.
  // Browsers default to 'auto' which tries to restore scroll position
  // on popstate — but this fights with our own scroll restoration logic
  // (which needs to wait for React to un-hide the Storefront before
  // scrolling). Setting to 'manual' gives us full control.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // On mount: reconcile the current view with the URL / history.state.
  useEffect(() => {
    // Priority 1: parse the URL. This is the ONLY reliable signal on a
    // fresh page load (refresh / deep link) where history.state is null.
    const fromUrl = parseUrlToState()
    if (fromUrl) {
      useUI.getState().restoreFromHistory(fromUrl)
      return
    }

    // Priority 2: history.state. Present after in-app navigations where
    // ui-store.ts already pushed state.
    // Next.js wraps history.state in { state: {...}, __NA: true, ... }
    // so we need to unwrap it.
    const rawState = window.history.state ?? null
    const current = (rawState?.state ?? rawState ?? null) as HistoryEntryState | null
    if (current && current.view) {
      useUI.getState().restoreFromHistory(current)
      return
    }

    // Priority 3: fall back to whatever Zustand has (persisted from
    // last session) and sync history to match.
    replaceHistory(view, selectedProductId, searchQuery)
     
  }, [])

  // Listen for browser back/forward (popstate) and restore the
  // corresponding view from history.state.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const rawState = (e.state ?? null) as HistoryEntryState | { state?: HistoryEntryState } | null
      const state = (rawState && typeof rawState === 'object' && 'state' in rawState ? rawState.state : rawState) as HistoryEntryState | null
      if (state && state.view) {
        useUI.getState().restoreFromHistory(state)
      } else {
        // No state — fall back to parsing the URL
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
