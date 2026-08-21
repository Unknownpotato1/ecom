'use client'

import { useEffect, useState } from 'react'
import { Instagram, Twitter, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import { useUI } from '@/lib/ui-store'

const CATEGORIES = ['Chocolate', 'Festive', 'Birthday', 'Anniversary', 'Spa', 'Coffee']
const HELP_LINKS = ['Track Order', 'Shipping Policy', 'Returns & Refunds', 'FAQs', 'Contact Us']
const COMPANY_LINKS = ['About Us', 'Bulk & Corporate Gifting', 'Careers', 'Privacy Policy', 'Terms of Service']

export function Footer() {
  const { goHome, goSearch } = useUI()
  const [logoUrl, setLogoUrl] = useState('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.logoUrl) setLogoUrl(d.settings.logoUrl)
        setVisible(d.settings?.footerVisible !== 'false')
      })
      .catch(() => {})
  }, [])

  if (!visible) return null

  const handleCompanyLink = (link: string) => {
    if (link === 'About Us') {
      if (typeof window !== 'undefined') {
        window.location.href = '/pages/about-us'
      }
    } else {
      goHome()
    }
  }

  return (
    <footer className="mt-auto bg-brand text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-2">
          {/* Logo only — no "Eviola" text. Uses uploaded logo or default "A" badge. */}
          <button onClick={goHome} className="inline-flex items-center justify-center mb-3 hover:scale-105 transition-transform" aria-label="Eviola home">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Eviola"
                className="block"
                style={{ display: 'block', maxHeight: '48px', maxWidth: '180px', width: 'auto', height: 'auto' }}
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand font-bold text-2xl shadow-sm">
                A
              </span>
            )}
          </button>
          <p className="text-sm text-white/80 max-w-sm">
            Hand-curated gift hampers for every celebration. Designed, packed and shipped with love from Bengaluru, India.
          </p>
          <div className="mt-4 space-y-2 text-sm text-white/90">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5" /> <span>Gomtinagar, Lucknow 226010, India</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> <span>+91 80 4567 8910</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> <span>contact@eviola.in</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-white/80">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  className="hover:text-white transition-colors"
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
          <ul className="space-y-2 text-sm text-white/80">
            {HELP_LINKS.map((l) => (
              <li key={l}>
                <button className="hover:text-white transition-colors" onClick={() => goHome()}>
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-white/80">
            {COMPANY_LINKS.map((l) => (
              <li key={l}>
                <button className="hover:text-white transition-colors" onClick={() => handleCompanyLink(l)}>
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment + socials */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-white/70">
            © {new Date().getFullYear()} Eviola Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            {['VISA', 'MC', 'UPI', 'COD'].map((p) => (
              <span
                key={p}
                className="px-2 py-1 text-[10px] font-semibold rounded bg-white/15 border border-white/20 text-white/90"
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
                className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white hover:text-brand transition-colors"
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
