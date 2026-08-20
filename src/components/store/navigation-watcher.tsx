'use client'

import { useEffect } from 'react'
import { useUI, replaceHistory, type HistoryEntryState } from '@/lib/ui-store'

/**
 * Parse a URL path + query string into a HistoryEntryState.
 *
 * Supports both slug-based and legacy ID-based URLs:
 *   /product/{slug}     → product view (new)
 *   /product/{id}       → product view (legacy, will be resolved)
 *   /collection/{slug}  → collection view (new)
 *   /collection/{id}    → collection view (legacy, will be resolved)
 *   /pages/about-us     → about page
 *   /pages/contact-us   → contact page
 *   /policies/privacy-policy        → privacy policy page
 *   /policies/terms-and-conditions  → terms page
 *   /policies/shipping-policy       → shipping policy page
 *   /policies/refund-policy         → refund policy page
 *   /checkout, /orders, /profile, /admin, /search?q=...
 *
 * For product/collection URLs, we can't tell if the URL segment is a
 * slug or an ID just by looking at it. We store it as selectedProductId/
 * selectedCollectionId — the components will try ID first, then slug.
 *
 * Returns null if the path doesn't match any known SPA route.
 */
function parseUrlToState(): HistoryEntryState | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  const search = window.location.search

  // /product/{slug-or-id}
  const productMatch = path.match(/^\/product\/(.+)$/)
  if (productMatch) {
    return {
      view: 'product',
      selectedProductId: decodeURIComponent(productMatch[1]),
      selectedProductSlug: decodeURIComponent(productMatch[1]),
    }
  }

  // /collection/{slug-or-id}
  const collectionMatch = path.match(/^\/collection\/(.+)$/)
  if (collectionMatch) {
    return {
      view: 'collection',
      selectedProductId: null,
      selectedCollectionId: decodeURIComponent(collectionMatch[1]),
      selectedCollectionSlug: decodeURIComponent(collectionMatch[1]),
    }
  }

  // /pages/about-us, /pages/contact-us
  if (path === '/pages/about-us' || path === '/pages/contact-us') {
    // These render as static content pages — for now, route to home
    // since we don't have dedicated page components yet.
    // TODO: Add About/Contact page components
    return { view: 'home', selectedProductId: null }
  }

  // /policies/{policy-name}
  if (path.startsWith('/policies/')) {
    // Same as above — route to home for now
    // TODO: Add policy page components
    return { view: 'home', selectedProductId: null }
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

export function NavigationWatcher() {
  const view = useUI((s) => s.view)
  const selectedProductId = useUI((s) => s.selectedProductId)
  const searchQuery = useUI((s) => s.searchQuery)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    const fromUrl = parseUrlToState()
    if (fromUrl) {
      useUI.getState().restoreFromHistory(fromUrl)
      return
    }

    const rawState = window.history.state ?? null
    const current = (rawState?.state ?? rawState ?? null) as HistoryEntryState | null
    if (current && current.view) {
      useUI.getState().restoreFromHistory(current)
      return
    }

    replaceHistory(view, selectedProductId, searchQuery)
  }, [])

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const rawState = (e.state ?? null) as HistoryEntryState | { state?: HistoryEntryState } | null
      const state = (rawState && typeof rawState === 'object' && 'state' in rawState ? rawState.state : rawState) as HistoryEntryState | null
      if (state && state.view) {
        useUI.getState().restoreFromHistory(state)
      } else {
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
