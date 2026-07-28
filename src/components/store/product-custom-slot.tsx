'use client'

import { useEffect, useState } from 'react'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { CustomSection } from '@/lib/types'

/**
 * Renders custom sections assigned to a specific slot on the product page.
 * Fetches all custom sections once (cached in a module-level variable to
 * avoid repeated fetches when multiple slots are on the same page),
 * filters by the given slot, and renders them in position order.
 *
 * All sections render in compact mode (no max-width wrapper, no title).
 */

// Module-level cache so all ProductCustomSlot instances on the same
// product page share a single fetch.
let cachedSections: CustomSection[] | null = null
let fetchPromise: Promise<CustomSection[]> | null = null

async function fetchSections(): Promise<CustomSection[]> {
  if (cachedSections) return cachedSections
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('/api/custom-sections')
    .then((r) => r.json())
    .then((data) => {
      cachedSections = (data.sections as CustomSection[]).filter((s) => s.visible)
      return cachedSections
    })
    .catch(() => {
      return []
    })
  return fetchPromise
}

export function ProductCustomSlot({ slot }: { slot: string }) {
  const [sections, setSections] = useState<CustomSection[]>([])

  useEffect(() => {
    let active = true
    fetchSections().then((all) => {
      if (!active) return
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
