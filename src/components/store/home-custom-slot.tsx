'use client'

import { useEffect, useState } from 'react'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { CustomSection } from '@/lib/types'

/**
 * Renders custom sections assigned to a specific homepage slot.
 * Uses a module-level cache shared with ProductCustomSlot.
 */

let cachedHomeSections: CustomSection[] | null = null
let homeFetchPromise: Promise<CustomSection[]> | null = null

async function fetchHomeSections(): Promise<CustomSection[]> {
  if (cachedHomeSections) return cachedHomeSections
  if (homeFetchPromise) return homeFetchPromise
  homeFetchPromise = fetch('/api/custom-sections', { cache: 'no-store' })
    .then((r) => r.json())
    .then((data) => {
      cachedHomeSections = (data.sections as CustomSection[]).filter((s) => s.visible)
      return cachedHomeSections
    })
    .catch(() => [])
  return homeFetchPromise
}

export function HomeCustomSlot({ slot }: { slot: string }) {
  const [sections, setSections] = useState<CustomSection[]>([])

  useEffect(() => {
    let active = true
    fetchHomeSections().then((all) => {
      if (!active) return
      // Match by slot name. Also map legacy slots:
      // - 'storefront' → renders at 'home-above-hero'
      // - 'home-in-grid' → renders at 'home-above-hero'
      // - 'home-above-products' → renders at 'home-above-hero'
      // - 'home-below-products' → renders at 'home-after-collections'
      const filtered = all
        .filter((s) => {
          const sSlot = s.slot || s.location || 'storefront'
          if (sSlot === slot) return true
          // Legacy mappings
          if (slot === 'home-above-hero' && (sSlot === 'storefront' || sSlot === 'home-in-grid' || sSlot === 'home-above-products')) return true
          if (slot === 'home-after-collections' && (sSlot === 'home-below-products' || sSlot === 'home-above-footer')) return true
          return false
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
    <>
      {sections.map((s) => (
        <CustomSectionRenderer key={s.id} section={s} />
      ))}
    </>
  )
}
