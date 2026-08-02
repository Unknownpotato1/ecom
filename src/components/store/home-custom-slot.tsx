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
      // Match by slot.
      //
      // ⚠️ NOTE: 'storefront' sections are NOT matched to any home slot here.
      // Storefront-slotted sections (including the video section) are handled
      // by the Storefront component itself — video sections are injected
      // INTO the product grid after the 10th product (see storefront.tsx
      // isVideoSection + ProductGrid insertAfterN).
      //
      // Previously, 'storefront' was mapped to 'home-above-products', which
      // caused the video section to render BOTH above the products AND
      // (if the Storefront was also rendering it) after 10 products — a
      // duplicate. Removing the storefront→home-above-products mapping
      // eliminates the duplicate above-products rendering.
      const filtered = all
        .filter((s) => {
          const sSlot = s.slot || s.location || 'storefront'
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
    <>
      {sections.map((s) => (
        <CustomSectionRenderer key={s.id} section={s} />
      ))}
    </>
  )
}
