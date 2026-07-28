'use client'

import { useEffect, useState } from 'react'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { CustomSection } from '@/lib/types'

/**
 * Renders custom sections targeted to the product detail page
 * (location: 'product-below-actions'). Placed right after the
 * Add to bag / Buy now / Wishlist buttons.
 *
 * Uses compact mode so the section fills the product info column
 * (no max-w-7xl wrapper) and hides the title heading — the section's
 * own HTML/CSS controls all visual styling.
 */
export function ProductCustomSections() {
  const [sections, setSections] = useState<CustomSection[]>([])

  useEffect(() => {
    let active = true
    fetch('/api/custom-sections')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const productSections = (data.sections as CustomSection[])
          .filter((s) => s.visible && s.location === 'product-below-actions')
          .sort((a, b) => a.position - b.position)
        setSections(productSections)
      })
      .catch(() => {
        if (active) setSections([])
      })
    return () => {
      active = false
    }
  }, [])

  if (sections.length === 0) return null

  return (
    <div className="mt-6 space-y-4">
      {sections.map((s) => (
        <CustomSectionRenderer key={s.id} section={s} compact hideTitle />
      ))}
    </div>
  )
}
