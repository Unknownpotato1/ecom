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
}: SwipeableImageProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const isDragging = useRef(false)
  const didSwipeRef = useRef(false)

  // Reset index when images change (e.g. navigating to a different product)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(initialIndex)
  }, [initialIndex, images])

  const goTo = (index: number) => {
    if (index < 0 || index >= images.length) return
    setActiveIndex(index)
    onIndexChange?.(index)
  }

  const next = () => goTo(Math.min(activeIndex + 1, images.length - 1))
  const prev = () => goTo(Math.max(activeIndex - 1, 0))

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

      {/* Desktop arrow controls (only if multiple images) */}
      {images.length > 1 && (
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

      {/* Image counter badge (top-right, only for product page style) */}
      {images.length > 1 && indicator === 'bar' && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-medium">
          {activeIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
