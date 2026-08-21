'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/ui-store'

/**
 * About Us page — tells the Eviola story.
 * Accessible at /pages/about-us
 */
export function AboutPage() {
  const { goHome } = useUI()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 fade-up">
      <button onClick={goHome} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">About Eviola</h1>
      <p className="text-lg text-muted-foreground mb-8">More than jewelry. A story of passion, affordability, and trust.</p>

      <div className="prose prose-sm sm:prose-base max-w-none space-y-6 text-foreground">
        <p>
          Founded in 2019 in Lucknow by Shahbaz Ahmad, Eviola began from a simple need—to build something of our own during a time when financial stability was uncertain.
        </p>
        <p>
          What started as a way to create a better future gradually became something much more meaningful. With every order, every new design, and every customer who chose to trust us, our work became our passion.
        </p>
        <p>
          Today, Eviola brings together artificial jewelry and thoughtfully curated gift hampers for women, created for those special little moments when you want to look beautiful, make someone smile, or simply treat yourself.
        </p>

        <h2 className="text-xl font-semibold tracking-tight mt-8 mb-3">Our Promise</h2>
        <p>
          We believe looking and feeling special shouldn't have to come with an unreasonable price tag. That's why we focus on three things at the heart of everything we do:
        </p>
        <ul className="space-y-2 ml-4">
          <li><strong>Affordable</strong> — Beautiful pieces at prices that feel worth it.</li>
          <li><strong>Quality</strong> — Products we can confidently put our name behind.</li>
          <li><strong>Trust</strong> — An honest relationship with every customer, every order, and every promise we make.</li>
        </ul>
        <p>
          From choosing a piece of jewelry for yourself to sending a gift to someone you love, we want every Eviola experience to feel special.
        </p>

        <div className="border-l-4 border-brand pl-4 my-8 italic text-muted-foreground">
          <p className="text-sm font-semibold not-italic text-foreground mb-2">From Shahbaz, Founder of Eviola</p>
          <p>
            "Eviola started because I needed to build something during a difficult financial phase. I never imagined that what began as a necessity would eventually become something I genuinely love doing.
          </p>
          <p className="mt-2">
            Today, every order reminds me how far we've come—and motivates me to keep building a brand that people can trust."
          </p>
        </div>

        <p className="text-center font-medium text-lg pt-4">
          Thank you for being a part of the Eviola story.
        </p>
        <p className="text-center text-muted-foreground">
          Eviola — Made to make moments special.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-brand text-white hover:shadow-lg" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
        </Button>
      </div>
    </div>
  )
}
