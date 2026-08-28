'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SwipeableImageProps {
  images: Array<{ url: string; alt?: string | null }>
  className?: string
  imageClassName?: string
  onIndexChange?: (index: number) => void
  /** 'bar' = thin progress bar at bottom; 'dots' = pill dots at bottom center */
  indicator?: 'bar' | 'dots' | 'none'
  /** object-fit for the images */
  objectFit?: 'cover' | 'contain'
  /** drag threshold in px (default 40) */
  threshold?: number
  /** initial index */
  initialIndex?: number
  /** adaptive: no fixed height, image shows at natural aspect ratio (no padding/cropping).
   *  Only the active image renders (no sliding track) so height adjusts per image. */
  adaptive?: boolean
}

/**
 * Swipeable image carousel supporting touch and mouse drag.
 * Used on:
 * - Product detail page (full-size, object-contain, progress bar)
 * - Product card on home page (square, object-cover, dots indicator)
 *
 * After a successful swipe, the next click event is swallowed via
 * `didSwipeRef` so the parent's onClick (e.g. card navigation) doesn't fire.
 */
export function SwipeableImage({
  images,
  className,
  imageClassName,
  onIndexChange,
  indicator = 'bar',
  objectFit = 'cover',
  threshold = 40,
  initialIndex = 0,
  adaptive = false,
}: SwipeableImageProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  // Ref mirror of activeIndex so next()/prev()/handleEnd() always read the
  // LATEST value, avoiding stale-closure bugs where a swipe uses an outdated
  // index. This is critical because the parent re-renders on onIndexChange,
  // and the event handlers need to see the current index at all times.
  const activeIndexRef = useRef(initialIndex)
  // Direction of the last navigation — used to pick the correct slide-in
  // animation (from-right for next, from-left for prev). Stored as STATE
  // (not a ref) because it's read during render to choose the animation.
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const isDragging = useRef(false)
  const didSwipeRef = useRef(false)

  // Centralized index updater — keeps the ref and state in sync and fires
  // the onIndexChange callback. All navigation goes through this function.
  // dir is set alongside the index so React batches both updates into the
  // same render — the new image appears with the correct slide direction.
  const updateIndex = (index: number, dir: 'next' | 'prev') => {
    if (index < 0 || index >= images.length) return
    if (index === activeIndexRef.current) return
    activeIndexRef.current = index
    setDirection(dir)
    setActiveIndex(index)
    onIndexChange?.(index)
  }

  // Reset index when the PRODUCT changes (not on every parent re-render).
  // The bug was: the parent (ProductDetail) creates a new `images` array
  // on every render via .map(), so depending on `images` caused this effect
  // to fire on every re-render — resetting activeIndex to 0 after every
  // swipe. Fix: depend on a STABLE signature (the first image URL) instead
  // of the array reference. When the user navigates to a different product,
  // the first image URL changes and the index resets. When they just swipe
  // (same product, same images), the URL is unchanged and no reset happens.
  const firstImageUrl = images[0]?.url
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(initialIndex)
    activeIndexRef.current = initialIndex
  }, [initialIndex, firstImageUrl])

  const goTo = (index: number) => {
    if (index < 0 || index >= images.length) return
    const dir = index > activeIndexRef.current ? 'next' : 'prev'
    updateIndex(index, dir)
  }

  const next = () => {
    const target = Math.min(activeIndexRef.current + 1, images.length - 1)
    if (target !== activeIndexRef.current) {
      updateIndex(target, 'next')
    }
  }
  const prev = () => {
    const target = Math.max(activeIndexRef.current - 1, 0)
    if (target !== activeIndexRef.current) {
      updateIndex(target, 'prev')
    }
  }

  const handleStart = (clientX: number) => {
    touchStartX.current = clientX
    touchEndX.current = clientX
    isDragging.current = true
  }

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return
    touchEndX.current = clientX
  }

  const handleEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > threshold) {
      didSwipeRef.current = true
      if (diff > 0) next()
      else prev()
    }
  }

  // Swallow the click after a swipe so the parent's onClick doesn't fire
  const handleClickCapture = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.stopPropagation()
      e.preventDefault()
      didSwipeRef.current = false
    }
  }

  if (images.length === 0) {
    return (
      <div className={cn('flex items-center justify-center bg-pink-50', className)}>
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    )
  }

  // Adaptive mode: render only the active image at natural dimensions.
  // No fixed height, no sliding track — the image shows at its full natural
  // aspect ratio with zero padding/cropping. Swiping swaps the image with
  // a smooth crossfade transition (opacity fade) so it doesn't feel jarring.
  if (adaptive) {
    const img = images[activeIndex]
    return (
      <div
        className={cn('relative select-none cursor-grab active:cursor-grabbing', className)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onClickCapture={handleClickCapture}
      >
        {/*
          Slide animation — the active image is rendered with a `key` set
          to the activeIndex so React remounts the <img> on every swipe.
          The CSS animation direction depends on which way the user swiped:
            - next (swipe left)  → aurora-slide-in-right (enters from right)
            - prev (swipe right) → aurora-slide-in-left  (enters from left)
          `direction` is a state value set alongside activeIndex in
          updateIndex(), so React batches both into the same render — the
          new image appears with the correct slide direction. 0.3s ease-out
          for a smooth, snappy slide.
        */}
        <img
          key={activeIndex}
          src={img.url}
          alt={img.alt || ''}
          className={cn('block w-full h-auto', imageClassName)}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            animation: direction === 'next'
              ? 'aurora-slide-in-right 0.3s ease-out'
              : 'aurora-slide-in-left 0.3s ease-out',
          }}
          draggable={false}
        />

        {/* Desktop arrow controls */}
        {images.length > 1 && indicator === 'bar' && (
          <>
            <button
              type="button"
              onClickCapture={handleClickCapture}
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
              aria-label="Previous image"
              style={{ opacity: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClickCapture={handleClickCapture}
              onClick={(e) => { e.stopPropagation(); next() }}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
              aria-label="Next image"
              style={{ opacity: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Progress bar */}
        {images.length > 1 && indicator === 'bar' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/15">
            <div
              className="h-full bg-brand transition-all duration-300 ease-out"
              style={{ width: `${((activeIndex + 1) / images.length) * 100}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden select-none cursor-grab active:cursor-grabbing', className)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onClickCapture={handleClickCapture}
    >
      {/* Sliding track */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            className="min-w-full h-full flex items-center justify-center"
          >
            <img
              src={img.url}
              alt={img.alt || ''}
              className={cn('pointer-events-none', imageClassName)}
              style={{ objectFit, width: '100%', height: '100%' }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Desktop arrow controls (only on bar/product-page mode) */}
      {images.length > 1 && indicator === 'bar' && (
        <>
          <button
            type="button"
            onClickCapture={handleClickCapture}
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
            aria-label="Previous image"
            style={{ opacity: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClickCapture={handleClickCapture}
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
            aria-label="Next image"
            style={{ opacity: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Progress indicator */}
      {images.length > 1 && indicator === 'bar' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/15">
          <div
            className="h-full bg-brand transition-all duration-300 ease-out"
            style={{ width: `${((activeIndex + 1) / images.length) * 100}%` }}
          />
        </div>
      )}

      {images.length > 1 && indicator === 'dots' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClickCapture={handleClickCapture}
              onClick={(e) => {
                e.stopPropagation()
                goTo(i)
              }}
              className={cn(
                'rounded-full transition-all duration-300',
                i === activeIndex
                  ? 'w-4 h-1.5 bg-white shadow-sm'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
