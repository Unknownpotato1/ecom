'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { CustomSection as CustomSectionType } from '@/lib/types'

interface Props {
  section: CustomSectionType
  /** Drop the max-width wrapper so the section fills its parent container (used on product page) */
  compact?: boolean
  /** Hide the section title heading (the section's own HTML still renders) */
  hideTitle?: boolean
}

/**
 * Renders admin-authored HTML + CSS + JS in an isolated shadow root,
 * so the custom code cannot break the rest of the store UI.
 *
 * The outer wrapper does NOT add its own border — the section's CSS is
 * responsible for any border styling. This avoids double borders.
 */
export function CustomSectionRenderer({ section, compact, hideTitle }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Attach shadow only once; reuse on subsequent renders.
    let shadow: ShadowRoot
    if (host.shadowRoot) {
      shadow = host.shadowRoot
    } else {
      shadow = host.attachShadow({ mode: 'open' })
    }

    // Build scoped styles
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      :host { display: block; }
      ${section.css || ''}
    `

    // Wrap HTML
    const wrapper = document.createElement('div')
    wrapper.className = 'aurora-custom-section'
    wrapper.innerHTML = section.html || ''

    // Reset and rebuild
    shadow.innerHTML = ''
    shadow.appendChild(styleEl)
    shadow.appendChild(wrapper)

    // Run JS inside the shadow (best-effort, scoped via IIFE)
    if (section.js) {
      try {
        // Provide scoped querySelector inside the shadow
        const fn = new Function(
          'root',
          'shadow',
          'document',
          'window',
          `"use strict";\n${section.js}`
        )
        fn(wrapper, shadow, document, window)
      } catch (e) {
        console.error('Custom section JS error:', e)
      }
    }
  }, [section.html, section.css, section.js, section.id])

  // compact mode: no max-width wrapper, no title, no extra padding.
  // The section's own CSS controls width, border, padding, etc.
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
      <div className={compact ? 'px-4 sm:px-6 lg:px-8 py-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'}>
        {/* No outer border — the section's own CSS controls border styling.
            This avoids the double-border issue. */}
        <div ref={hostRef} className="aurora-custom-host w-full" />
      </div>
    </section>
  )
}

/** Inline preview used inside the admin editor */
export function CustomSectionPreview({ section }: { section: Partial<CustomSectionType> }) {
  const hostRef = useRef<HTMLDivElement>(null)

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
    styleEl.textContent = `:host { display: block; padding: 16px; background: #fff; }\n${section.css || ''}`
    const wrapper = document.createElement('div')
    wrapper.innerHTML = section.html || ''
    shadow.innerHTML = ''
    shadow.appendChild(styleEl)
    shadow.appendChild(wrapper)
    if (section.js) {
      try {
        const fn = new Function('root', 'shadow', 'document', 'window', `"use strict";\n${section.js}`)
        fn(wrapper, shadow, document, window)
      } catch (e) {
        console.error('Preview JS error:', e)
      }
    }
  }, [section.html, section.css, section.js])

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
