'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { CustomSection as CustomSectionType } from '@/lib/types'

interface Props {
  section: CustomSectionType
  compact?: boolean
  hideTitle?: boolean
}

/**
 * Parses a single code string into { html, css, js }.
 * Extracts <style>...</style> blocks → CSS,
 * <script>...</script> blocks → JS,
 * remaining content → HTML.
 *
 * Supports the new single-box format (code field) and falls back to
 * legacy separate fields (html, css, js) if code is empty.
 */
function parseCode(section: CustomSectionType): { html: string; css: string; js: string } {
  // New format: single code box
  if (section.code) {
    let css = ''
    let js = ''
    let html = section.code

    // Extract <style> blocks
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, content) => {
      css += content + '\n'
      return ''
    })

    // Extract <script> blocks
    html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => {
      js += content + '\n'
      return ''
    })

    return { html: html.trim(), css: css.trim(), js: js.trim() }
  }

  // Legacy format: separate fields
  return {
    html: section.html || '',
    css: section.css || '',
    js: section.js || '',
  }
}

/**
 * Renders admin-authored code in an isolated shadow root.
 * The code is a single box containing HTML with inline <style> and <script> tags.
 */
export function CustomSectionRenderer({ section, compact, hideTitle }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  const { html, css, js } = parseCode(section)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let shadow: ShadowRoot
    if (host.shadowRoot) {
      shadow = host.shadowRoot
    } else {
      shadow = host.attachShadow({ mode: 'open' })
    }

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      :host { display: block; }
      ${css}
    `

    const wrapper = document.createElement('div')
    wrapper.className = 'aurora-custom-section'
    wrapper.innerHTML = html

    shadow.innerHTML = ''
    shadow.appendChild(styleEl)
    shadow.appendChild(wrapper)

    if (js) {
      try {
        const fn = new Function(
          'root',
          'shadow',
          'document',
          'window',
          `"use strict";\n${js}`
        )
        fn(wrapper, shadow, document, window)
      } catch (e) {
        console.error('Custom section JS error:', e)
      }
    }
  }, [html, css, js, section.id])

  if (compact) {
    return (
      <div className="w-full">
        <div ref={hostRef} className="aurora-custom-host w-full" />
      </div>
    )
  }

  return (
    <section className="relative w-full">
      {!hideTitle && section.title && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{section.title}</h2>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div ref={hostRef} className="aurora-custom-host w-full" />
      </div>
    </section>
  )
}

/** Inline preview used inside the admin editor */
export function CustomSectionPreview({ section }: { section: Partial<CustomSectionType> }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const { html, css, js } = parseCode(section as CustomSectionType)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let shadow: ShadowRoot
    if (host.shadowRoot) {
      shadow = host.shadowRoot
    } else {
      shadow = host.attachShadow({ mode: 'open' })
    }
    const styleEl = document.createElement('style')
    styleEl.textContent = `:host { display: block; padding: 16px; background: #fff; }\n${css}`
    const wrapper = document.createElement('div')
    wrapper.innerHTML = html
    shadow.innerHTML = ''
    shadow.appendChild(styleEl)
    shadow.appendChild(wrapper)
    if (js) {
      try {
        const fn = new Function('root', 'shadow', 'document', 'window', `"use strict";\n${js}`)
        fn(wrapper, shadow, document, window)
      } catch (e) {
        console.error('Preview JS error:', e)
      }
    }
  }, [html, css, js])

  return (
    <div className="rounded-lg border border-pink-100 overflow-hidden">
      <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center justify-between">
        <span>Live preview (isolated)</span>
        <X className="h-3 w-3" />
      </div>
      <div ref={hostRef} className="bg-white" />
    </div>
  )
}
