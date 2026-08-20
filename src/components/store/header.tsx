'use client'

import { useEffect, useState } from 'react'
import {
  Menu,
  Search,
  X,
  ChevronRight,
} from 'lucide-react'
import { BagIcon } from './bag-icon'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MENU_LINKS = [] as const

export function Header() {
  const itemCount = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0))
  const openCart = useCart((s) => s.openCart)
  const { goHome, goAdmin, goOrders, goCollection, searchOpen, setSearchOpen, mobileMenuOpen, setMobileMenuOpen, goSearch } = useUI()
  const { user, isAdmin, signOut } = useAuth()
  const [searchVal, setSearchVal] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [collections, setCollections] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
    // Fetch logo from settings
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.logoUrl) setLogoUrl(d.settings.logoUrl)
      })
      .catch(() => {})
    // Fetch ALL collections for menu (including ones hidden from homepage)
    fetch('/api/collections?all=1')
      .then((r) => r.json())
      .then((d) => {
        if (d.collections) {
          setCollections(d.collections.map((c: { id: string; name: string; slug: string }) => ({ id: c.id, name: c.name, slug: c.slug || '' })))
        }
      })
      .catch(() => {})
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchVal.trim()) {
      goSearch(searchVal.trim())
      setSearchOpen(false)
      setSearchVal('')
    }
  }

  return (
    <>
      <header className="bg-brand text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-3 items-center">
          {/* Left: menu */}
          <div className="flex items-center justify-start">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/15"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Center: logo (uploaded image at natural aspect ratio, or default "A" badge) */}
          <div className="flex items-center justify-center">
            <button
              onClick={goHome}
              className="inline-flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Eviola home"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Eviola"
                  className="block"
                  style={{ display: 'block', maxHeight: '40px', maxWidth: '160px', width: 'auto', height: 'auto' }}
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand font-bold text-xl shadow-sm">
                  A
                </span>
              )}
            </button>
          </div>

          {/* Right: actions (search + bag only; account is in the menu) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/15"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Bag icon — custom minimal SVG bag */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full text-white hover:bg-white/15"
              aria-label="Open bag"
              onClick={openCart}
            >
              <BagIcon className="h-5 w-5" />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 inline-flex items-center justify-center rounded-full bg-white text-brand text-[9px] font-semibold leading-none">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
          <SheetHeader className="p-4 border-b border-pink-100">
            <SheetTitle className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Eviola" style={{ display: 'block', maxHeight: '32px', maxWidth: '120px', width: 'auto', height: 'auto' }} />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white font-bold">A</span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="py-2">
            {/* Collections in menu — 2 per row */}
            {collections.length > 0 && (
              <div className="px-3 pt-2">
                <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Collections</p>
                <div className="grid grid-cols-2 gap-2">
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setMobileMenuOpen(false)
                        goCollection(c.id, c.slug)
                      }}
                      className="flex items-center justify-center px-3 py-3 text-sm font-medium rounded-lg bg-brand-soft/40 text-center hover:bg-brand-soft transition-colors truncate"
                    >
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-pink-100 mt-2 pt-2">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      useUI.getState().goOrders()
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-brand-soft"
                  >
                    <span>My Orders</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {isAdmin() && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        goAdmin()
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-brand hover:bg-brand-soft"
                    >
                      <span>Admin Panel</span>
                      <ChevronRight className="h-4 w-4 text-brand" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut()
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-destructive hover:bg-brand-soft"
                  >
                    <span>Sign out</span>
                    <ChevronRight className="h-4 w-4 text-destructive" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    useUI.getState().goProfile()
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-brand-soft"
                >
                  <span>Sign in with Google</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Search modal */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="h-auto p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Search products</SheetTitle>
          </SheetHeader>
          <div className="p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Search hampers</h2>
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <form onSubmit={submitSearch} className="flex gap-2">
                <Input
                  autoFocus
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Try 'chocolate', 'festive', 'coffee'..."
                  className="h-12 text-base"
                />
                <Button type="submit" size="lg" className="bg-brand hover:bg-brand text-white h-12 px-6">
                  <Search className="h-5 w-5" />
                </Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Chocolate', 'Festive', 'Coffee', 'Birthday', 'Anniversary', 'Spa'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      goSearch(s)
                      setSearchOpen(false)
                    }}
                    className="px-3 py-1.5 text-xs rounded-full bg-brand-soft text-brand hover:bg-brand hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function HeaderPadding({ className }: { className?: string }) {
  return <div className={cn('', className)} />
}
