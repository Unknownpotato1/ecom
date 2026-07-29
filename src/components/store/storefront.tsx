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

export function Storefront({ heroFallback }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [heroSetting, setHeroSetting] = useState<HeroConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/sections').then((r) => r.json()),
      fetch('/api/custom-sections').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([secData, customData, settingsData]) => {
        if (!active) return
        const visibleSections = (secData.sections as Section[]).filter((s) => s.visible)
        // Only render custom sections marked as 'storefront' (default) on the home page.
        // 'product-below-actions' sections render on the product detail page instead.
        const visibleCustom = (customData.sections as CustomSection[])
          .filter((s) => s.visible && (
            (s.slot || s.location || 'storefront') === 'storefront'
          ))
          .sort((a, b) => a.position - b.position)
        setSections(visibleSections.sort((a, b) => a.position - b.position))
        setCustomSections(visibleCustom)
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

  if (sections.length === 0 && customSections.length === 0) {
    return (
      <>
        <HeroSection config={heroFallback || { imageUrl: '', title: 'Aurora Gifts', subtitle: 'Curated hampers, hand-packed with love.' }} />
        <ProductGrid title="Explore Hampers" filter="all" anchorId="all-hampers" listenToFilterEvents />
      </>
    )
  }

  // Interleave sections and custom sections based on a unified position.
  const allItems: Array<{ kind: 'section'; data: Section } | { kind: 'custom'; data: CustomSection }> = [
    ...sections.map((s) => ({ kind: 'section' as const, data: s })),
    ...customSections.map((c) => ({ kind: 'custom' as const, data: c })),
  ]
    .filter((item) => {
      // Hide any admin-configured "Trending Now" and "Best Sellers" product
      // sections — per the new home design, the home page only shows the
      // single "Explore Hampers" grid. Custom (HTML) sections are kept.
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
            : heroFallback || { imageUrl: '', title: 'Aurora', subtitle: '' }
          const adminConfig = heroSetting
          const effectiveConfig: HeroConfig = adminConfig?.imageUrl
            ? adminConfig
            : sectionConfig.imageUrl
            ? sectionConfig
            : heroFallback || { imageUrl: '' }
          return <HeroSection key={s.id} config={effectiveConfig} />
        }
        if (s.type === 'products') {
          const cfg = s.config ? JSON.parse(s.config) : { filter: 'all' }
          const filter: 'all' | 'best' | 'trending' = cfg.filter || 'all'
          // The only product section that survives the filter above is
          // the "all" grid. Force its title to "Explore Hampers" and give
          // it the canonical anchor + filter-event listener.
          return (
            <ProductGrid
              key={s.id}
              title="Explore Hampers"
              filter="all"
              anchorId="all-hampers"
              listenToFilterEvents
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

      {/* Always ensure an "Explore Hampers" grid is rendered on the home
          page, even if the admin hasn't configured one. This guarantees
          visitors can always browse all hampers. Skipped if the admin
          already placed an "all" products section above. */}
      {!hasAllGrid && (
        <ProductGrid
          title="Explore Hampers"
          filter="all"
          anchorId="all-hampers"
          listenToFilterEvents
        />
      )}
    </>
  )
}
