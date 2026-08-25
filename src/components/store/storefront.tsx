'use client'

import { useEffect, useState } from 'react'
import { HeroSection } from './hero-section'
import { ProductGrid } from './product-grid'
import { CustomSectionRenderer } from './custom-section-renderer'
import type { Section, CustomSection, HeroConfig } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  heroFallback?: HeroConfig
}

/**
 * Detect whether a custom section's code contains a `<video` tag.
 *
 * Used to identify video custom sections that should be relocated from
 * their normal flow position INTO the Explore Jewelry product grid —
 * rendered after the 10th product (see insertAfterN prop on ProductGrid).
 *
 * The user said: "I have added a custom section on homepage that plays a
 * video, place that section after 10 products, don't change anything
 * just relocate." This automatic detection means the admin doesn't need
 * to tag the section in any special way — any storefront custom section
 * containing a <video> element is treated as the relocated video banner.
 *
 * We check both `code` (the unified code field) and the legacy `html`
 * field, case-insensitively, for the literal string "<video".
 */
function isVideoSection(section: CustomSection): boolean {
  const haystack = `${section.code || ''} ${section.html || ''}`.toLowerCase()
  return haystack.includes('<video')
}

/** Number of products to show before inserting the video section. */
const VIDEO_INSERT_AFTER_N = 10

export function Storefront({ heroFallback }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [heroSetting, setHeroSetting] = useState<HeroConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // ⚠️ cache: 'no-store' is REQUIRED on all these fetches.
    // Without it, the browser may serve a cached response when the
    // Storefront remounts (e.g. after navigating admin → home). This
    // caused a bug where custom section edits in the admin panel
    // didn't appear on the homepage until a hard refresh.
    // 'no-store' forces the browser to always make a fresh request.
    Promise.all([
      fetch('/api/sections', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/custom-sections', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/settings', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([secData, customData, settingsData]) => {
        if (!active) return
        const visibleSections = (secData.sections as Section[]).filter((s) => s.visible)
        // Custom sections are now rendered by HomeCustomSlot in page.tsx
        // at specific positions (above-header, above-hero, above-products, etc.)
        // The Storefront should NOT render any custom sections to avoid duplicates.
        setSections(visibleSections.sort((a, b) => a.position - b.position))
        setCustomSections([])
        // Load hero config from settings (where admin saves it)
        if (settingsData.settings?.hero) {
          try {
            setHeroSetting(JSON.parse(settingsData.settings.hero))
          } catch {
            // ignore
          }
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-[480px] w-full rounded-none" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Split custom sections into two groups:
  //  - video sections → injected INTO the Explore Jewelry grid after
  //    the 10th product (handled by ProductGrid's insertAfterN prop)
  //  - everything else → rendered in normal document flow
  //
  // If there are multiple video sections, they're all rendered inside
  // the grid at the same insertion point (stacked vertically, since
  // the insertContent wrapper is a single full-width cell).
  const videoSections = customSections.filter(isVideoSection)
  const otherCustomSections = customSections.filter((s) => !isVideoSection(s))

  // The JSX to inject after the 10th product (all video sections stacked)
  const videoInsertContent =
    videoSections.length > 0
      ? videoSections.map((vs) => (
          <CustomSectionRenderer key={`video-${vs.id}`} section={vs} />
        ))
      : null

  if (sections.length === 0 && otherCustomSections.length === 0) {
    return (
      <>
        <HeroSection config={heroFallback || { imageUrl: '', title: 'Eviola', subtitle: 'Curated jewelry, crafted with love.' }} />
        <ProductGrid
          title="Explore Jewelry"
          filter="all"
          anchorId="all-jewelry"
          listenToFilterEvents
          insertAfterN={videoInsertContent ? VIDEO_INSERT_AFTER_N : null}
          insertContent={videoInsertContent}
        />
      </>
    )
  }

  // Interleave sections and custom sections (excluding video sections,
  // which are injected into the grid) based on a unified position.
  const allItems: Array<{ kind: 'section'; data: Section } | { kind: 'custom'; data: CustomSection }> = [
    ...sections.map((s) => ({ kind: 'section' as const, data: s })),
    ...otherCustomSections.map((c) => ({ kind: 'custom' as const, data: c })),
  ]
    .filter((item) => {
      // Hide any admin-configured "Trending Now" and "Best Sellers" product
      // sections — per the new home design, the home page only shows the
      // single "Explore Jewelry" grid. Custom (HTML) sections are kept.
      if (item.kind !== 'section') return true
      const s = item.data
      if (s.type !== 'products') return true
      const cfg = s.config ? JSON.parse(s.config) : { filter: 'all' }
      const filter = cfg.filter || 'all'
      return filter !== 'best' && filter !== 'trending'
    })
    .sort((a, b) => {
      const ap = a.data.position
      const bp = b.data.position
      if (ap !== bp) return ap - bp
      return a.kind === 'section' ? -1 : 1
    })

  // Track whether the home page already includes an "all" product grid
  // (admin-configured). If not, we'll append one at the end so the home
  // page always shows all hampers.
  const hasAllGrid = allItems.some(
    (i) => i.kind === 'section' && i.data.type === 'products' && (!i.data.config || JSON.parse(i.data.config).filter === 'all')
  )

  return (
    <>
      {allItems.map((item) => {
        if (item.kind === 'custom') {
          return <CustomSectionRenderer key={`custom-${item.data.id}`} section={item.data} />
        }
        const s = item.data
        if (s.type === 'hero') {
          // Priority: admin-saved settings.hero > section config > fallback
          // The admin hero editor saves to settings.hero, NOT to the section config.
          // So we check heroSetting first — if it has an imageUrl, use it.
          const sectionConfig: HeroConfig = s.config
            ? JSON.parse(s.config)
            : heroFallback || { imageUrl: '', title: 'Eviola', subtitle: '' }
          const adminConfig = heroSetting
          const effectiveConfig: HeroConfig = adminConfig?.imageUrl
            ? adminConfig
            : sectionConfig.imageUrl
            ? sectionConfig
            : heroFallback || { imageUrl: '' }
          return <HeroSection key={s.id} config={effectiveConfig} />
        }
        if (s.type === 'products') {
          // The only product section that survives the filter above is
          // the "all" grid. Force its title to "Explore Jewelry" and give
          // it the canonical anchor + filter-event listener.
          // Video sections are injected after the 10th product.
          return (
            <ProductGrid
              key={s.id}
              title="Explore Jewelry"
              filter="all"
              anchorId="all-jewelry"
              listenToFilterEvents
              insertAfterN={videoInsertContent ? VIDEO_INSERT_AFTER_N : null}
              insertContent={videoInsertContent}
            />
          )
        }
        if (s.type === 'text') {
          const cfg = s.config ? JSON.parse(s.config) : { title: s.title, body: '' }
          return (
            <section key={s.id} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center fade-up">
              {cfg.title && <h2 className="text-2xl font-semibold tracking-tight">{cfg.title}</h2>}
              {cfg.body && <p className="mt-3 text-muted-foreground">{cfg.body}</p>}
            </section>
          )
        }
        return null
      })}

      {/* Always ensure an "Explore Jewelry" grid is rendered on the home
          page, even if the admin hasn't configured one. This guarantees
          visitors can always browse all hampers. Skipped if the admin
          already placed an "all" products section above.
          Video sections are injected after the 10th product. */}
      {!hasAllGrid && (
        <ProductGrid
          title="Explore Jewelry"
          filter="all"
          anchorId="all-jewelry"
          listenToFilterEvents
          insertAfterN={videoInsertContent ? VIDEO_INSERT_AFTER_N : null}
          insertContent={videoInsertContent}
        />
      )}
    </>
  )
}
