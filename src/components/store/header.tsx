'use client'

import { useEffect, useState } from 'react'
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
  ChevronRight,
} from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const MENU_LINKS = [
  { label: 'All Hampers', view: 'home', filter: 'all' },
  { label: 'Best Sellers', view: 'home', filter: 'best' },
  { label: 'Trending', view: 'home', filter: 'trending' },
  { label: 'Festive', view: 'home', filter: 'festive' },
  { label: 'Birthday', view: 'home', filter: 'birthday' },
  { label: 'Anniversary', view: 'home', filter: 'anniversary' },
] as const

export function Header({ announcement }: { announcement?: string }) {
  const itemCount = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0))
  const openCart = useCart((s) => s.openCart)
  const { goHome, goAdmin, goOrders, searchOpen, setSearchOpen, mobileMenuOpen, setMobileMenuOpen, goSearch } = useUI()
  const { user, isAdmin, signOut } = useAuth()
  const [searchVal, setSearchVal] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
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
      {announcement && (
        <div className="bg-brand text-white text-xs sm:text-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 text-center font-medium tracking-wide overflow-hidden whitespace-nowrap">
            <span className="inline-block">{announcement}</span>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: menu + brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-brand-soft"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <button
              onClick={goHome}
              className="flex items-center gap-2 group"
              aria-label="Aurora home"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white font-bold text-lg shadow-sm">
                A
              </span>
              <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground group-hover:text-brand transition-colors">
                Aurora
              </span>
            </button>
          </div>

          {/* Center: nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {MENU_LINKS.map((l) => (
              <Button
                key={l.label}
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-foreground/80 hover:text-brand hover:bg-brand-soft"
                onClick={() => {
                  goHome()
                  // Reaching into the home page filter via custom event
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('aurora:filter', { detail: l.filter }))
                  }
                }}
              >
                {l.label}
              </Button>
            ))}
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-brand-soft"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-brand-soft"
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {user.image && <AvatarImage src={user.image} alt={user.name || user.email} />}
                        <AvatarFallback className="bg-brand-soft text-brand">
                          {(user.name || user.email)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-tight">{user.name || 'Account'}</span>
                        <span className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => useUI.getState().goOrders()}>
                      My Orders
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <DropdownMenuItem onClick={goAdmin} className="text-brand font-medium">
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => useUI.getState().goProfile()}>
                      Sign in with Google
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => useUI.getState().goOrders()}>
                      Track Order
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full hover:bg-brand-soft"
              aria-label="Open bag"
              onClick={openCart}
            >
              <ShoppingBag className="h-5 w-5" />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 inline-flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white font-bold">A</span>
              Aurora
            </SheetTitle>
          </SheetHeader>
          <div className="py-2">
            {MENU_LINKS.map((l) => (
              <button
                key={l.label}
                onClick={() => {
                  setMobileMenuOpen(false)
                  goHome()
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('aurora:filter', { detail: l.filter }))
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-brand-soft transition-colors"
              >
                <span>{l.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
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
                <Button type="submit" size="lg" className="bg-brand hover:bg-brand/90 text-white h-12 px-6">
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
                    className="px-3 py-1.5 text-xs rounded-full bg-brand-soft text-brand-deep hover:bg-brand hover:text-white transition-colors"
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
