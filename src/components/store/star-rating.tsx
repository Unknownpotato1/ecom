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
      {/* Overlay layer: 5 amber stars clipped to fillPercent width. */}
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

/**
 * StockStatus — small pulsing-dot indicator, e.g. "In Stock".
 *
 * Uses a plain <style> tag (NOT <style jsx>) because Next.js 16 dropped
 * built-in styled-jsx support — <style jsx> silently emits the JSX class
 * names but NOT the CSS rules, so the indicator would render with no
 * styling (no pulsing dot, no layout) and appear invisible/broken.
 */
export function StockStatus() {
  return (
    <div className="stock-status">
      <span className="stock-dot" />
      <span>In Stock</span>

      <style>{`
        .stock-status {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 0 10px;
          margin: 0;
          font-size: 13px;
          font-weight: 400;
          color: #000000;
        }

        .stock-dot {
          width: 9px;
          height: 9px;
          min-width: 9px;
          background: #22c55e;
          border-radius: 50%;
          position: relative;
        }

        .stock-dot::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #22c55e;
          animation: stockPulse 1.8s infinite;
        }

        @keyframes stockPulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          70% {
            transform: scale(2.8);
            opacity: 0;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * ProductRatingBlock — StarRating with StockStatus displayed directly below it.
 */
export function ProductRatingBlock({
  rating,
  sizeClass,
  starClassName,
  className,
}: StarRatingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <StarRating rating={rating} sizeClass={sizeClass} starClassName={starClassName} className={className} />
      <StockStatus />
    </div>
  )
}
