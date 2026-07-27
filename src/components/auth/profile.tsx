'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { useUI } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, LogOut, ChevronRight, Package, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

// Real Google "G" logo SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

export function Profile() {
  const { user, signIn, signOut, isAdmin } = useAuth()
  const { goAdmin, goOrders, goHome } = useUI()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      // Mock Google sign-in flow — replace with real Firebase signInWithPopup in production.
      // If NEXT_PUBLIC_FIREBASE_API_KEY is set, you can wire up real firebase auth here.
      const useDemo = !email.trim()
      const demoEmail = email.trim() || 'guest@aurora.gifts'
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          name: name.trim() || (useDemo ? 'Aurora Guest' : email.split('@')[0]),
        }),
      })
      const data = await res.json()
      signIn({
        email: data.user.email,
        name: data.user.name,
        image: data.user.image,
      })
      toast.success(`Signed in as ${data.user.email}`)
      if (data.isAdmin) {
        setTimeout(() => goAdmin(), 600)
      } else {
        setTimeout(() => goHome(), 600)
      }
    } catch (e) {
      console.error(e)
      toast.error('Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminDemo = () => {
    setEmail('shahbazahmad9783@gmail.com')
    setName('Shahbaz (Admin)')
    toast.info('Admin email prefilled. Click "Sign in with Google" to enter the admin panel.')
  }

  if (user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 fade-up">
        <Card className="border-pink-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-brand" /> Your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-soft/40">
              <div className="h-12 w-12 rounded-full bg-brand text-white font-bold inline-flex items-center justify-center text-lg">
                {(user.name || user.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{user.name || 'Aurora Customer'}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              {isAdmin() && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand text-white text-[10px] font-semibold">
                  <ShieldCheck className="h-3 w-3" /> ADMIN
                </span>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={goOrders}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-pink-100 hover:bg-brand-soft/40"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-brand" /> My Orders
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              {isAdmin() && (
                <button
                  onClick={goAdmin}
                  className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-brand bg-brand-soft/40 hover:bg-brand-soft"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-brand">
                    <ShieldCheck className="h-4 w-4" /> Admin Panel
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                signOut()
                goHome()
                toast.success('Signed out')
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 fade-up">
      <Card className="border-pink-100">
        <CardHeader className="text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-brand text-white font-bold inline-flex items-center justify-center text-xl mb-2">
            A
          </div>
          <CardTitle className="text-xl">Welcome to Aurora</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to track orders, save favourites and check out faster.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 bg-white text-foreground border border-pink-200 hover:bg-brand-soft"
          >
            <GoogleIcon className="h-5 w-5 mr-2" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-pink-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or sign in with email (demo)</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-xs">Name (optional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="you@email.com" />
            </div>
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !email}
              className="w-full h-11 bg-brand text-white hover:bg-brand/90"
            >
              {loading ? 'Please wait...' : 'Sign in'}
            </Button>
          </div>

          <button
            onClick={handleAdminDemo}
            className="w-full text-xs text-muted-foreground hover:text-brand mt-2"
          >
            <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
            Demo: use admin email
          </button>

          <p className="text-[11px] text-muted-foreground text-center mt-4">
            By continuing you agree to Aurora's Terms of Service and Privacy Policy.
            <br />
            <span className="text-muted-foreground/70">
              Note: This is a demo sign-in flow. Connect Firebase credentials in production to enable real Google authentication.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
