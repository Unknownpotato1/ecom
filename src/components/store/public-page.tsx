'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Page } from '@/lib/types'

interface PageDoc {
  id: string
  title: string
  slug: string
  code: string
  published: boolean
  position: number
  createdAt: string
  updatedAt: string
}

/**
 * Renders a custom page created by the admin.
 *
 * Flow:
 *   1. Look up the page by slug via GET /api/pages?all=0 (only returns published).
 *   2. If found, render its `code` (HTML + inline <style> + inline <script>)
 *      inside an isolated shadow DOM — same approach as CustomSectionRenderer,
 *      so pages can have their own styles and scripts without leaking
 *      into the rest of the app.
 *   3. If not found, show a 404 page with a link back to home.
 *
 * URL: /{slug}  (e.g. /valentines-day-sale)
 */
export function PublicPage({ slug }: { slug: string }) {
  const { goHome } = useUI()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)

  // Fetch the page by slug
  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    setPage(null)
    fetch('/api/pages')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const pages: PageDoc[] = data.pages || []
        const found = pages.find((p) => p.slug === slug)
        if (found && found.published) {
          setPage(found as unknown as Page)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setNotFound(true)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [slug])

  // Update document title for SEO + browser tab
  useEffect(() => {
    if (page?.title) {
      const prev = document.title
      document.title = `${page.title} — Eviola`
      return () => {
        document.title = prev
      }
    }
  }, [page?.title])

  // Render page code into the shadow DOM (same isolated approach
  // as CustomSectionRenderer, so the page's CSS/JS doesn't leak).
  useEffect(() => {
    const host = hostRef.current
    if (!host || !page) return

    let shadow: ShadowRoot
    if (host.shadowRoot) {
      shadow = host.shadowRoot
    } else {
      shadow = host.attachShadow({ mode: 'open' })
    }

    const code = page.code || ''
    let css = ''
    let js = ''
    let html = code

    // Extract <style>...</style> blocks → CSS
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, content) => {
      css += content + '\n'
      return ''
    })

    // Extract <script>...</script> blocks → JS
    html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => {
      js += content + '\n'
      return ''
    })

    // Extract CSS custom properties from :root blocks and inject them
    // into :host so they cascade into the shadow DOM.
    let rootVars = ''
    const processedCss = css.replace(/:root\s*\{([^}]*)\}/gi, (_, content) => {
      const varMatches = content.match(/--[\w-]+\s*:\s*[^;]+;?/g)
      if (varMatches) rootVars += varMatches.join('\n') + '\n'
      return ''
    })

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      :host { display: block; position: relative; ${rootVars} }
      ${processedCss}
    `

    const wrapper = document.createElement('div')
    wrapper.className = 'eviola-page'
    wrapper.innerHTML = html.trim()

    shadow.innerHTML = ''
    shadow.appendChild(styleEl)
    shadow.appendChild(wrapper)

    if (js.trim()) {
      try {
        // Proxy `document` so the page's JS can use getElementById etc.
        const docProxy = new Proxy(document, {
          get(target, prop, receiver) {
            if (prop === 'getElementById') {
              return (id: string) => wrapper.querySelector(`#${id}`) || shadow.querySelector(`#${id}`)
            }
            if (prop === 'querySelector') {
              return (selector: string) => shadow.querySelector(selector) || wrapper.querySelector(selector)
            }
            if (prop === 'querySelectorAll') {
              return (selector: string) => shadow.querySelectorAll(selector)
            }
            if (prop === 'getElementsByClassName') {
              return (className: string) =>
                (shadow as unknown as Document).getElementsByClassName(className)
            }
            if (prop === 'getElementsByTagName') {
              return (tagName: string) =>
                (shadow as unknown as Document).getElementsByTagName(tagName)
            }
            if (prop === 'getElementsByName') {
              return (name: string) => shadow.querySelectorAll(`[name="${name}"]`)
            }
            if (prop === 'createElement') {
              return (tagName: string, options?: ElementCreationOptions) =>
                document.createElement(tagName, options)
            }
            const value = Reflect.get(target, prop, receiver)
            return typeof value === 'function' ? value.bind(target) : value
          },
        })
        const fn = new Function(
          'root',
          'shadow',
          'document',
          'window',
          `"use strict";\n${js}`
        )
        fn(wrapper, shadow, docProxy, window)
      } catch (e) {
        console.error('[PublicPage] JS error:', e)
      }
    }
  }, [page])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been removed.
        </p>
        <Button className="bg-brand text-white hover:shadow-lg" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
        </Button>
      </div>
    )
  }

  if (!page) {
    // Shouldn't happen, but be defensive
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand" />
      </div>
    )
  }

  // Render the page code via shadow DOM
  return (
    <div className="fade-up">
      {/* Skip nav + header offset */}
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-white focus:text-brand focus:rounded"
      >
        Skip to content
      </a>
      <div ref={hostRef} id="page-content" className="eviola-page-host w-full" />
    </div>
  )
}
