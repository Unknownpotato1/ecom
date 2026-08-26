'use client'

import type { HeroConfig } from '@/lib/types'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils'

/**
 * Hero section — displays ONLY the uploaded image at its natural aspect ratio.
 * No text, buttons, tags, badges, or gradient overlays.
 * Vertical images show tall, horizontal images show wide — no cropping.
 */
export function HeroSection({ config }: { config: HeroConfig }) {
  if (!config.imageUrl) {
    return (
      <section className="w-full">
        <div className="w-full bg-brand-soft flex items-center justify-center py-20">
          <span className="text-muted-foreground text-sm">No hero image uploaded yet</span>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full">
      {/* Image adapts to its natural dimensions:
        - width: 100% (full container width)
        - height: auto (preserves aspect ratio)
        - display: block (removes inline gap)
        Vertical photos → tall hero. Horizontal photos → wide hero. No crop.
        Full-width banner → w_1600 covers 2x retina on most mobile/desktop.
        Non-Cloudinary URLs returned unchanged by the helper.
      */}
      <img
        src={optimizeCloudinaryUrl(config.imageUrl, 1600)}
        alt="Eviola hero"
        className="block w-full h-auto"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </section>
  )
}
