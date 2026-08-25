'use client'

import { useEffect, useRef, useState } from 'react'

const MARQUEE_ITEMS = [
  'Free shipping on orders above ₹249',
  '10% off on prepaid orders',
  'PAN India delivery',
  'Premium quality products',
  'Easy & secure checkout',
]

const SLIDES = [
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_00-44-35-859_yeeyat.jpg',
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_03-41-38-146_kmqdjq.jpg',
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_03-12-50-832_da42z7.jpg',
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_03-16-14-535_jmvnnb.jpg',
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_03-17-11-688_spitze.jpg',
  'https://res.cloudinary.com/dfjst3the/image/upload/v1787629553/Picsart_26-08-25_03-23-03-329_ixuhlx.jpg',
]

const TOTAL_SLIDES = SLIDES.length
const TRACK_LENGTH = TOTAL_SLIDES + 2 // + 2 clones
const SLIDE_WIDTH_PERCENT = 100 / TRACK_LENGTH
const SLIDE_DURATION = 6000
const TRANSITION_STYLE = 'transform .8s cubic-bezier(.22,.61,.36,1)'

// Track order: [clone-of-last, slide0..slide5, clone-of-first]
const TRACK_SLIDES = [SLIDES[TOTAL_SLIDES - 1], ...SLIDES, SLIDES[0]]

export function PromoSlideshow() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const trackIndexRef = useRef(1) // 1..6 map to real slides 0..5
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchRef = useRef({ startX: 0, currentX: 0, isDragging: false })

  const [activeIndex, setActiveIndex] = useState(0) // real slide 0-5, for progress dots

  const realIndexFor = (idx: number) => ((idx - 1) + TOTAL_SLIDES) % TOTAL_SLIDES

  const moveTrack = (withTransition: boolean) => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = withTransition ? TRANSITION_STYLE : 'none'
    track.style.transform = `translateX(-${trackIndexRef.current * SLIDE_WIDTH_PERCENT}%)`
  }

  const updateProgress = () => {
    setActiveIndex(realIndexFor(trackIndexRef.current))
  }

  const snapIfOnClone = () => {
    if (trackIndexRef.current === TRACK_LENGTH - 1) {
      trackIndexRef.current = 1
      moveTrack(false)
    } else if (trackIndexRef.current === 0) {
      trackIndexRef.current = TOTAL_SLIDES
      moveTrack(false)
    }
  }

  const nextSlide = () => {
    trackIndexRef.current += 1
    moveTrack(true)
    updateProgress()
    trackRef.current?.addEventListener('transitionend', snapIfOnClone, { once: true })
  }

  const previousSlide = () => {
    trackIndexRef.current -= 1
    moveTrack(true)
    updateProgress()
    trackRef.current?.addEventListener('transitionend', snapIfOnClone, { once: true })
  }

  const goToSlide = (realIndex: number) => {
    trackIndexRef.current = realIndex + 1
    moveTrack(true)
    updateProgress()
  }

  const startAutoPlay = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(nextSlide, SLIDE_DURATION)
  }

  const userNext = () => {
    nextSlide()
    startAutoPlay()
  }

  const userPrevious = () => {
    previousSlide()
    startAutoPlay()
  }

  useEffect(() => {
    moveTrack(false)
    updateProgress()
    startAutoPlay()

    const viewport = viewportRef.current
    if (!viewport) return

    const handleTouchStart = (e: TouchEvent) => {
      if (timerRef.current) clearInterval(timerRef.current)
      touchRef.current.startX = e.touches[0].clientX
      touchRef.current.currentX = touchRef.current.startX
      touchRef.current.isDragging = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchRef.current.isDragging) return
      touchRef.current.currentX = e.touches[0].clientX
    }

    const handleTouchEnd = () => {
      if (!touchRef.current.isDragging) return
      const difference = touchRef.current.currentX - touchRef.current.startX
      touchRef.current.isDragging = false

      if (difference < -50) {
        userNext()
      } else if (difference > 50) {
        userPrevious()
      } else {
        startAutoPlay()
      }
    }

    viewport.addEventListener('touchstart', handleTouchStart, { passive: true })
    viewport.addEventListener('touchmove', handleTouchMove, { passive: true })
    viewport.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      viewport.removeEventListener('touchstart', handleTouchStart)
      viewport.removeEventListener('touchmove', handleTouchMove)
      viewport.removeEventListener('touchend', handleTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* MARQUEE */}
      <div className="aurora-marquee">
        <div className="aurora-marquee-track">
          {[0, 1].map((set) => (
            <span key={set} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={`${set}-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className="aurora-marquee-item">{item}</span>
                  <span className="aurora-marquee-separator" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* SLIDESHOW */}
      <section className="premium-slideshow">
        <div className="slide-viewport" ref={viewportRef}>
          <div className="slide-track" ref={trackRef}>
            {TRACK_SLIDES.map((src, i) => (
              <div className="slide" key={i}>
                <img src={src} alt={i > 0 && i <= TOTAL_SLIDES ? `Slide ${i}` : ''} draggable={false} />
              </div>
            ))}
          </div>

          <div className="progress-area">
            {SLIDES.map((_, index) => (
              <div
                key={index}
                className={`progress-item ${
                  index < activeIndex ? 'completed' : index === activeIndex ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                  startAutoPlay()
                }}
              >
                <div className="progress-fill" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        Plain <style> tag (NOT <style jsx>).
        Next.js 16 dropped built-in styled-jsx support — <style jsx>
        silently emits the JSX class names but NOT the CSS rules, so the
        component would render unstyled on production. Using a regular
        <style> tag works everywhere. The rules are scoped by the unique
        class names (aurora-marquee, premium-slideshow, slide-track, ...)
        which only exist in this component, so there's no leak risk.
      */}
      <style>{`
        /* MARQUEE */
        .aurora-marquee {
          width: 100%;
          overflow: hidden;
          background: #000;
          color: #fff;
          white-space: nowrap;
        }

        .aurora-marquee-track {
          display: inline-flex;
          align-items: center;
          width: max-content;
          animation: auroraScroll 22s linear infinite;
          will-change: transform;
        }

        .aurora-marquee-item {
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.3px;
          padding: 5px 0;
        }

        .aurora-marquee-separator {
          display: inline-block;
          width: 120px;
          height: 1px;
          background: #fff;
          margin: 0 28px;
          flex-shrink: 0;
        }

        @keyframes auroraScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (min-width: 768px) {
          .aurora-marquee-track {
            animation-duration: 28s;
          }
          .aurora-marquee-item {
            font-size: 14px;
          }
          .aurora-marquee-separator {
            width: 140px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-marquee-track {
            animation: none;
          }
        }

        /* SLIDESHOW */
        .premium-slideshow {
          width: 100%;
          overflow: hidden;
          background: #fff;
        }

        .slide-viewport {
          width: 100%;
          overflow: hidden;
          position: relative;
          touch-action: pan-y;
        }

        .slide-track {
          display: flex;
          width: 800%;
          transform: translateX(-12.5%);
          will-change: transform;
        }

        .slide {
          width: 12.5%;
          flex: 0 0 12.5%;
          position: relative;
        }

        .slide img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }

        .progress-area {
          position: absolute;
          left: 16px;
          bottom: 16px;
          z-index: 20;
          display: flex;
          gap: 4px;
          padding: 0;
        }

        .progress-item {
          width: 28px;
          height: 3px;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.35);
          border-radius: 0;
          cursor: pointer;
        }

        .progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          width: 0;
          height: 100%;
          background: #fff;
          border-radius: 0;
        }

        .progress-item.completed .progress-fill {
          width: 100%;
        }

        .progress-item.active .progress-fill {
          animation: progressFill 6s linear forwards;
        }

        @keyframes progressFill {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        @media (min-width: 768px) {
          .premium-slideshow {
            max-width: 900px;
            margin: 0 auto;
          }
        }

        @media (max-width: 480px) {
          .progress-area {
            left: 12px;
            bottom: 12px;
            gap: 3px;
          }
          .progress-item {
            width: 24px;
            height: 3px;
          }
        }
      `}</style>
    </>
  )
}
