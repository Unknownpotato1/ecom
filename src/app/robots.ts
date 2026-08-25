import type { MetadataRoute } from 'next'

/**
 * Dynamic robots.txt for eviola.in.
 *
 * Next.js App Router auto-discovers this file and serves it at /robots.txt.
 * This REPLACES the static /public/robots.txt — but since both can't coexist,
 * the static file in /public/robots.txt should be removed (or it will take
 * precedence). I'm leaving the static file in place for now and NOT creating
 * a conflict; this file is here as documentation of intent.
 *
 * IMPORTANT: This file will NOT take effect while /public/robots.txt exists.
 * To activate it, delete /public/robots.txt. For now, the static robots.txt
 * already allows all bots, so this is functionally equivalent.
 *
 * The sitemap URL is declared here so Google can auto-discover it via
 * robots.txt (in addition to manual submission in Search Console).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://eviola.in/sitemap.xml',
    host: 'https://eviola.in',
  }
}
