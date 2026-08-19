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

    // Extract CSS custom properties from :root blocks and inject them into :host
    // so they're available inside the shadow DOM. :root in a shadow DOM refers
    // to the document's <html> element, but CSS variables set on :root don't
    // always cascade into shadow roots. Moving them to :host fixes this.
    let rootVars = ''
    let processedCss = css.replace(/:root\s*\{([^}]*)\}/gi, (_, content) => {
      // Extract only custom properties (--var: value)
      const varMatches = content.match(/--[\w-]+\s*:\s*[^;]+;?/g)
      if (varMatches) rootVars += varMatches.join('\n      ') + '\n      '
      return '' // Remove the :root block from CSS
    })

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      :host { display: block; position: relative; overflow-x: hidden; ${rootVars} }
      ${processedCss}
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

    // When the browser tab becomes inactive (sleep, background tab),
    // requestAnimationFrame is throttled/paused. When the tab becomes
    // active again, some JS animations (especially custom slideshow
    // sections) don't resume properly — the RAF loop is stuck.
    // This listener detects visibility change and re-initializes the
    // section's JS by re-running the effect.
  }, [html, css, js, section.id])

  // Re-run the shadow DOM setup when the tab becomes visible again
  // (fixes slideshow sections disappearing after browser idle/sleep)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const host = hostRef.current
        if (!host) return
        const shadow = host.shadowRoot
        if (!shadow) return

        // Re-run the JS by re-executing the setup
        const { html: curHtml, css: curCss, js: curJs } = parseCode(section)
        if (!curJs) return

        // Clear and rebuild
        let rootVars = ''
        let processedCss = curCss.replace(/:root\s*\{([^}]*)\}/gi, (_, content) => {
          const varMatches = content.match(/--[\w-]+\s*:\s*[^;]+;?/g)
          if (varMatches) rootVars += varMatches.join('\n') + '\n'
          return ''
        })

        const styleEl = document.createElement('style')
        styleEl.textContent = `:host { display: block; position: relative; overflow-x: hidden; ${rootVars} }\n${processedCss}`

        const wrapper = document.createElement('div')
        wrapper.className = 'aurora-custom-section'
        wrapper.innerHTML = curHtml

        shadow.innerHTML = ''
        shadow.appendChild(styleEl)
        shadow.appendChild(wrapper)

        try {
          const docProxy = createDocumentProxy(shadow, wrapper)
          const fn = new Function(
            'root', 'shadow', 'document', 'window',
            `"use strict";\n${curJs}`
          )
          fn(wrapper, shadow, docProxy, window)
        } catch (e) {
          console.error('Custom section JS re-init error:', e)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [section.id, section.code, section.html, section.css, section.js])

  if (compact) {
    return (
      <div className="w-full">
        <div ref={hostRef} className="aurora-custom-host w-full" />
      </div>
    )
  }

  return (
    <section className="relative w-full">
      {/* Full-width — no max-w or padding wrapper. The section's own CSS
          controls all width, padding, and layout. This matches the hero
          banner (also full-width) for a consistent edge-to-edge look. */}
      <div ref={hostRef} className="aurora-custom-host w-full" />
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
    // Same :root → :host variable extraction for the preview
    let rootVars = ''
    let processedCss = css.replace(/:root\s*\{([^}]*)\}/gi, (_, content) => {
      const varMatches = content.match(/--[\w-]+\s*:\s*[^;]+;?/g)
      if (varMatches) rootVars += varMatches.join('\n      ') + '\n      '
      return ''
    })
    const styleEl = document.createElement('style')
    styleEl.textContent = `:host { display: block; padding: 16px; background: #fff; ${rootVars} }\n${processedCss}`
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
