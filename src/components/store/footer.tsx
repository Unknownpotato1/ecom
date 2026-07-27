'use client'

import { Instagram, Twitter, Facebook, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['Chocolate', 'Festive', 'Birthday', 'Anniversary', 'Spa', 'Coffee']
const HELP_LINKS = ['Track Order', 'Shipping Policy', 'Returns & Refunds', 'FAQs', 'Contact Us']
const COMPANY_LINKS = ['Our Story', 'Bulk & Corporate Gifting', 'Careers', 'Privacy Policy', 'Terms of Service']

export function Footer() {
  const { goHome, goSearch } = useUI()

  return (
    <footer className="mt-auto bg-foreground text-white">
      {/* Newsletter strip */}
      <div className="bg-brand text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold">Join the Aurora list</h3>
            <p className="text-white/90 text-sm mt-1">
              Get 10% off your first hamper, plus early access to festive drops and gift guides.
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              ;(e.currentTarget.querySelector('input') as HTMLInputElement).value = ''
            }}
          >
            <Input
              type="email"
              required
              placeholder="you@email.com"
              className="bg-white/95 text-foreground border-0 h-11"
            />
            <Button type="submit" className="bg-foreground hover:bg-foreground/85 text-white h-11 px-5">
              <Send className="h-4 w-4 mr-1" /> Subscribe
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white font-bold text-lg">A</span>
            <span className="text-xl font-semibold">Aurora</span>
          </div>
          <p className="text-sm text-white/70 max-w-sm">
            Hand-curated gift hampers for every celebration. Designed, packed and shipped with love from Bengaluru, India.
          </p>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-brand" /> <span>Koramangala, Bengaluru 560034, India</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-brand" /> <span>+91 80 4567 8910</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" /> <span>hello@aurora.gifts</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  className="hover:text-brand transition-colors"
                  onClick={() => goSearch(c)}
                >
                  {c} Hampers
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {HELP_LINKS.map((l) => (
              <li key={l}>
                <button className="hover:text-brand transition-colors" onClick={() => goHome()}>
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {COMPANY_LINKS.map((l) => (
              <li key={l}>
                <button className="hover:text-brand transition-colors" onClick={() => goHome()}>
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment + socials */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} Aurora Gifts Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            {['VISA', 'MC', 'UPI', 'COD'].map((p) => (
              <span
                key={p}
                className="px-2 py-1 text-[10px] font-semibold rounded bg-white/10 border border-white/15 text-white/80"
              >
                {p}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-brand transition-colors"
                aria-label="social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
