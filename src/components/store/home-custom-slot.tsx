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
      // Match by slot name exactly. Legacy slots are NOT auto-mapped here —
      // they must be explicitly re-assigned via the admin panel to the new
      // before/after collection slots.
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
