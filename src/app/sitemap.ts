import type { MetadataRoute } from 'next'

/**
 * Dynamic sitemap for eviola.in.
 *
 * Next.js App Router auto-discovers this file and serves it at /sitemap.xml.
 * Google Search Console can then be pointed at /sitemap.xml to discover ALL
 * product, collection, and custom-page URLs at once — much faster than
 * waiting for Googlebot to discover them by crawling.
 *
 * URL patterns (must match ui-store.ts pushState calls):
 *   /                        → homepage
 *   /product/<slug>          → product detail
 *   /collection/<slug>       → collection page
 *   /pages/<slug>            → custom page (about-us, etc.)
 *
 * The SPA rewrite in next.config.ts forwards all these paths back to "/",
 * so they all serve the same HTML — but Google can still index each URL
 * separately because the SPA restores the correct view from the path on
 * mount (NavigationWatcher component). Modern Googlebot renders JavaScript,
 * so each URL will be indexed with its correct content.
 *
 * Fetches products + collections + pages from the API on each sitemap
 * request. These endpoints read from Firestore, so the sitemap is always
 * up-to-date with whatever the admin has added. Next.js caches the result
 * for the duration specified in `revalidate` (1 hour) to avoid hammering
 * Firestore on every Googlebot request.
 */

const SITE_URL = 'https://eviola.in'

// Revalidate every hour — balances freshness with Firestore load.
// Google typically fetches sitemaps a few times per day, so 1 hour is
// more than fresh enough.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // NOTE: All URLs must include a trailing slash on the domain root
  // (https://eviola.in/) — Google's sitemap parser rejects sitemaps
  // where the homepage URL lacks the trailing slash, especially for
  // new/untrusted domains. Product/collection/page URLs already have
  // a path segment so they're fine.
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  // Fetch products, collections, and pages in parallel.
  const [productsRes, collectionsRes, pagesRes] = await Promise.all([
    fetch(`${SITE_URL}/api/products`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${SITE_URL}/api/collections`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${SITE_URL}/api/pages`, { next: { revalidate: 3600 } }).catch(() => null),
  ])

  // Products
  if (productsRes?.ok) {
    try {
      const data = await productsRes.json()
      const products = data.products || []
      for (const p of products) {
        const slug = p.slug || p.id
        if (!slug) continue
        const lastMod = p.updatedAt ? new Date(p.updatedAt) : p.createdAt ? new Date(p.createdAt) : now
        entries.push({
          url: `${SITE_URL}/product/${slug}`,
          lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    } catch {}
  }

  // Collections
  if (collectionsRes?.ok) {
    try {
      const data = await collectionsRes.json()
      const collections = data.collections || []
      for (const c of collections) {
        const slug = c.slug || c.id
        if (!slug) continue
        const lastMod = c.updatedAt ? new Date(c.updatedAt) : c.createdAt ? new Date(c.createdAt) : now
        entries.push({
          url: `${SITE_URL}/collection/${slug}`,
          lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    } catch {}
  }

  // Custom pages (about-us, etc.)
  if (pagesRes?.ok) {
    try {
      const data = await pagesRes.json()
      const pages = data.pages || []
      for (const p of pages) {
        const slug = p.slug
        if (!slug) continue
        const lastMod = p.updatedAt ? new Date(p.updatedAt) : p.createdAt ? new Date(p.createdAt) : now
        entries.push({
          url: `${SITE_URL}/pages/${slug}`,
          lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
          changeFrequency: 'monthly',
          priority: 0.5,
        })
      }
    } catch {}
  }

  return entries
}
