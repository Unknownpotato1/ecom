import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  /** The rating value (0–5). Supports decimals, e.g. 4.5 → 4 full + 1 half. */
  rating: number
  /** Tailwind size class for each star, e.g. 'h-3 w-3' or 'h-4 w-4'. */
  sizeClass?: string
  /** Extra classes applied to each star (both base and overlay layers).
   *  Use for hover effects like 'transition-transform group-hover:scale-110'. */
  starClassName?: string
  /** Extra classes for the outer container. */
  className?: string
}

/**
 * StarRating — renders 5 stars with partial fill support.
 *
 * Uses the overlay-clip technique (same as Amazon / Flipkart):
 *   1. Base layer: 5 empty (gray) stars
 *   2. Overlay layer: 5 amber stars, clipped to `(rating / 5 * 100)%` width
 *
 * This handles ANY fractional rating smoothly:
 *   - 5.0 → 5 full amber stars
 *   - 4.5 → 4 full amber + 1 half amber/gray star
 *   - 4.3 → 4 full + 1 ~30% filled star
 *   - 0.0 → 5 empty gray stars
 *
 * Previously the code used `Math.round(rating)` which turned 4.5 → 5,
 * showing all stars as full. This component fixes that.
 */
export function StarRating({
  rating,
  sizeClass = 'h-3 w-3',
  starClassName,
  className,
}: StarRatingProps) {
  // Clamp to [0, 5] and compute the fill percentage.
  const clamped = Math.max(0, Math.min(5, rating))
  const fillPercent = (clamped / 5) * 100

  return (
    <div
      className={cn('relative inline-flex', className)}
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
      role="img"
    >
      {/* Base layer: 5 empty (gray) stars — always fully visible */}
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(sizeClass, 'fill-muted text-muted-foreground/30', starClassName)}
          />
        ))}
      </div>
      {/*
        Overlay layer: 5 amber stars clipped to fillPercent width.
        - absolute top-0 left-0 → positioned exactly over the base layer
        - overflow-hidden → clips the amber stars at the fill boundary
        - width: fillPercent% → e.g. 90% for a 4.5 rating
        - Each star has shrink-0 so flexbox doesn't compress them to
          fit the narrower container — they overflow and get clipped
          instead (which is what we want).
      */}
      <div
        className="absolute top-0 left-0 flex overflow-hidden"
        style={{ width: `${fillPercent}%`, height: '100%' }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(sizeClass, 'fill-amber-400 text-amber-400 shrink-0', starClassName)}
          />
        ))}
      </div>
    </div>
  )
}
