'use client'

import { useEffect, useState } from 'react'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { CustomSection } from '@/lib/types'

/**
 * Renders custom sections assigned to a specific homepage slot.
 *
 * NOTE: The previous module-level cache (cachedHomeSections) was removed
 * because it caused stale data — when the admin added/edited sections
 * and returned to the homepage, the old cached data was used instead
 * of fetching fresh data. Each HomeCustomSlot instance now fetches
 * independently with cache:'no-store'.
 */

export function HomeCustomSlot({ slot }: { slot: string }) {
  const [sections, setSections] = useState<CustomSection[]>([])

  useEffect(() => {
    let active = true
    fetch('/api/custom-sections', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const all = (data.sections as CustomSection[]).filter((s) => s.visible)
        const filtered = all
          .filter((s) => {
            const sSlot = s.slot || s.location || 'storefront'
            return sSlot === slot
          })
          .sort((a, b) => a.position - b.position)
        setSections(filtered)
      })
      .catch(() => {})
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
