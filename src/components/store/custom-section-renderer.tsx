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
 */
function parseCode(section: CustomSectionType): { html: string; css: string; js: string } {
  if (section.code) {
    let css = ''
    let js = ''
    let html = section.code

    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, content) => {
      css += content + '\n'
      return ''
    })

    html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => {
      js += content + '\n'
      return ''
    })

    return { html: html.trim(), css: css.trim(), js: js.trim() }
  }

  return {
    html: section.html || '',
    css: section.css || '',
    js: section.js || '',
  }
}

/**
 * Creates a proxy of `document` that delegates element-finding methods
 * (getElementById, querySelector, querySelectorAll, getElementsByClassName,
 * getElementsByTagName, getElementsByName, createElement) to the shadow root.
 *
 * This lets user JS code like `document.getElementById("myBtn")` work
 * correctly inside a Shadow DOM — without the proxy, it would search the
 * main document and return null.
 *
 * Non-element methods (addEventListener, etc.) still delegate to the real
 * document so global events still work.
 */
function createDocumentProxy(shadow: ShadowRoot, root: HTMLElement): Document {
  const realDoc = document
  return new Proxy(realDoc, {
    get(target, prop, receiver) {
      // Element-finding methods → search shadow root
      // NOTE: ShadowRoot does NOT have getElementById — use querySelector instead
      if (prop === 'getElementById') {
        return (id: string) => root.querySelector(`#${id}`) || shadow.querySelector(`#${id}`)
      }
      if (prop === 'querySelector') {
        return (selector: string) => shadow.querySelector(selector) || root.querySelector(selector)
      }
      if (prop === 'querySelectorAll') {
        return (selector: string) => shadow.querySelectorAll(selector)
      }
      if (prop === 'getElementsByClassName') {
        return (className: string) => shadow.getElementsByClassName(className)
      }
      if (prop === 'getElementsByTagName') {
        return (tagName: string) => shadow.getElementsByTagName(tagName)
      }
      if (prop === 'getElementsByName') {
        return (name: string) => shadow.querySelectorAll(`[name="${name}"]`)
      }
      if (prop === 'createElement') {
        return (tagName: string, options?: ElementCreationOptions) => realDoc.createElement(tagName, options)
      }
      if (prop === 'createTextNode') {
        return (data: string) => realDoc.createTextNode(data)
      }
      if (prop === 'createEvent') {
        return (type: string) => realDoc.createEvent(type)
      }
      // Everything else → real document
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

/**
 * Renders admin-authored code in an isolated shadow root.
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
      :host { display: block; position: relative; z-index: 50; }
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
        const docProxy = createDocumentProxy(shadow, wrapper)
        const fn = new Function(
          'root',
          'shadow',
          'document',
          'window',
          `"use strict";\n${js}`
        )
        fn(wrapper, shadow, docProxy, window)
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
        const docProxy = createDocumentProxy(shadow, wrapper)
        const fn = new Function('root', 'shadow', 'document', 'window', `"use strict";\n${js}`)
        fn(wrapper, shadow, docProxy, window)
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
