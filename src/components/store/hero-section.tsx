'use client'

import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui-store'
import type { HeroConfig } from '@/lib/types'

export function HeroSection({ config }: { config: HeroConfig }) {
  const { goHome } = useUI()

  const align =
    config.align === 'center'
      ? 'items-center text-center'
      : config.align === 'right'
      ? 'items-end text-right'
      : 'items-start text-left'

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[480px] sm:h-[560px] lg:h-[620px] w-full">
        {config.imageUrl ? (
           
          <img
            src={config.imageUrl}
            alt={config.title || 'Aurora hero'}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-brand-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className={`relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center ${align}`}>
          <div className="max-w-xl fade-up">
            {config.badge && (
              <span className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-brand-soft" />
                {config.badge}
              </span>
            )}
            {config.title && (
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                {config.title}
              </h1>
            )}
            {config.subtitle && (
              <p className="mt-4 text-base sm:text-lg text-white/90 max-w-lg">{config.subtitle}</p>
            )}
            {config.ctaText && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-brand hover:shadow-lg text-white shadow-lg px-6"
                  onClick={() => {
                    goHome()
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('aurora:filter', { detail: 'all' }))
                      setTimeout(() => {
                        document.getElementById('all-hampers')?.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }
                  }}
                >
                  {config.ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => {
                    goHome()
                    setTimeout(() => {
                      document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' })
                    }, 100)
                  }}
                >
                  Explore bestsellers
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
