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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/sections').then((r) => r.json()),
      fetch('/api/custom-sections').then((r) => r.json()),
    ])
      .then(([secData, customData]) => {
        if (!active) return
        const visibleSections = (secData.sections as Section[]).filter((s) => s.visible)
        const visibleCustom = (customData.sections as CustomSection[])
          .filter((s) => s.visible)
          .sort((a, b) => a.position - b.position)
        setSections(visibleSections.sort((a, b) => a.position - b.position))
        setCustomSections(visibleCustom)
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
        <ProductGrid title="All Hampers" filter="all" anchorId="all-hampers" />
      </>
    )
  }

  // Interleave sections and custom sections based on a unified position.
  const allItems: Array<{ kind: 'section'; data: Section } | { kind: 'custom'; data: CustomSection }> = [
    ...sections.map((s) => ({ kind: 'section' as const, data: s })),
    ...customSections.map((c) => ({ kind: 'custom' as const, data: c })),
  ].sort((a, b) => {
    const ap = a.data.position
    const bp = b.data.position
    if (ap !== bp) return ap - bp
    return a.kind === 'section' ? -1 : 1
  })

  // Pre-compute anchors for the FIRST occurrence of each product filter
  const anchors = {
    best: allItems.findIndex(
      (i) => i.kind === 'section' && i.data.type === 'products' && i.data.config && JSON.parse(i.data.config).filter === 'best'
    ),
    trending: allItems.findIndex(
      (i) => i.kind === 'section' && i.data.type === 'products' && i.data.config && JSON.parse(i.data.config).filter === 'trending'
    ),
    all: allItems.findIndex(
      (i) => i.kind === 'section' && i.data.type === 'products' && (!i.data.config || JSON.parse(i.data.config).filter === 'all')
    ),
  }

  return (
    <>
      {allItems.map((item, idx) => {
        if (item.kind === 'custom') {
          return <CustomSectionRenderer key={`custom-${item.data.id}`} section={item.data} />
        }
        const s = item.data
        if (s.type === 'hero') {
          const config: HeroConfig = s.config
            ? JSON.parse(s.config)
            : heroFallback || { imageUrl: '', title: 'Aurora', subtitle: '' }
          const merged: HeroConfig = {
            ...config,
            ...(config.imageUrl ? {} : (heroFallback || {})),
          }
          return <HeroSection key={s.id} config={merged} />
        }
        if (s.type === 'products') {
          const cfg = s.config ? JSON.parse(s.config) : { filter: 'all' }
          const filter: 'all' | 'best' | 'trending' = cfg.filter || 'all'
          let anchor: string | undefined
          if (idx === anchors.best) anchor = 'best-sellers'
          else if (idx === anchors.trending) anchor = 'trending-now'
          else if (idx === anchors.all) anchor = 'all-hampers'
          return (
            <ProductGrid
              key={s.id}
              title={s.title || (filter === 'best' ? 'Best Sellers' : filter === 'trending' ? 'Trending Now' : 'All Hampers')}
              filter={filter}
              anchorId={anchor}
              listenToFilterEvents={idx === anchors.all}
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
    </>
  )
}
