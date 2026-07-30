'use client'

import { useEffect, useState } from 'react'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { CustomSection } from '@/lib/types'

/**
 * Renders custom sections assigned to a specific slot on the product page.
 * Fetches all custom sections and filters by the given slot.
 *
 * All sections render in compact mode (no max-width wrapper, no title).
 *
 * ⚠️ No module-level cache — each product page mount fetches fresh data.
 * The previous module-level cache (cachedSections) caused stale content
 * when the user edited a custom section in admin and navigated to a
 * product page — the old cached sections were used instead of fetching
 * the updated code.
 *
 * Browsers automatically deduplicate concurrent identical fetch requests,
 * so multiple ProductCustomSlot instances on the same page won't cause
 * multiple network requests.
 */

export function ProductCustomSlot({ slot }: { slot: string }) {
  const [sections, setSections] = useState<CustomSection[]>([])

  useEffect(() => {
    let active = true
    // cache: 'no-store' prevents the browser from serving a cached
    // response, ensuring the user always sees the latest section code.
    fetch('/api/custom-sections', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const all = (data.sections as CustomSection[]).filter((s) => s.visible)
        // Match by slot, or legacy location field (product-below-actions → product-after-buttons)
        const filtered = all
          .filter((s) => {
            const sSlot = s.slot || s.location || 'storefront'
            // Map legacy product-below-actions to product-after-buttons
            if (slot === 'product-after-buttons' && sSlot === 'product-below-actions') return true
            return sSlot === slot
          })
          .sort((a, b) => a.position - b.position)
        setSections(filtered)
      })
      .catch(() => {
        if (active) setSections([])
      })
    return () => {
      active = false
    }
  }, [slot])

  if (sections.length === 0) return null

  return (
    <div className="mt-4 space-y-4">
      {sections.map((s) => (
        <CustomSectionRenderer key={s.id} section={s} compact hideTitle />
      ))}
    </div>
  )
}
