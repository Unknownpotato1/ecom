'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { useUI } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, LogOut, ChevronRight, Package, User as UserIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { isFirebaseClientAvailable, getFirebaseAuth } from '@/lib/firebase-client'
import { signInWithCustomToken } from 'firebase/auth'

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
  const [authMode, setAuthMode] = useState<'idle' | 'custom-token'>('idle')

  const firebaseAvailable = isFirebaseClientAvailable()

  /**
   * Sign-in flow:
   * 1. If Firebase client + Google popup available → use signInWithPopup (real Google SSO)
   * 2. Otherwise, demo email flow → POST /api/auth → server mints a Firebase custom token
   *    → client calls signInWithCustomToken to establish a real Firebase session
   * 3. Fallback: if custom token flow fails, just record the user locally (demo mode)
   */
  const handleSignIn = async () => {
    setLoading(true)
    try {
      const useDemo = !email.trim()
      const demoEmail = email.trim() || 'guest@eviola.in'
      const demoName = name.trim() || (useDemo ? 'Eviola Guest' : email.split('@')[0])

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, name: demoName }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Sign-in failed')
        return
      }

      // If server returned a Firebase custom token, sign in client-side for a real Firebase session
      if (data.customToken && firebaseAvailable) {
        try {
          setAuthMode('custom-token')
          const { auth } = getFirebaseAuth()!
          await signInWithCustomToken(auth, data.customToken)
        } catch (e) {
          console.warn('Custom token sign-in failed (continuing with local session):', (e as Error).message)
          // Non-fatal — we still have the user record server-side
        }
      }

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
      setAuthMode('idle')
    }
  }

  const handleGooglePopup = async () => {
    // Reserved for when Google Sign-In provider is enabled in Firebase Console.
    // The popup flow will call /api/auth with the resulting ID token.
    const fb = getFirebaseAuth()
    if (!fb) {
      toast.info('Firebase client not configured. Using email sign-in.')
      handleSignIn()
      return
    }
    setLoading(true)
    try {
      const { signInWithPopup } = await import('firebase/auth')
      const cred = await signInWithPopup(fb.auth, fb.googleProvider)
      const idToken = await cred.user.getIdToken()
      // Send email/name/photo alongside idToken as a backup in case
      // the server's Admin SDK can't verify the token
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: cred.user.email || undefined,
          name: cred.user.displayName || undefined,
          image: cred.user.photoURL || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Google sign-in failed')
        return
      }
      if (data.warnings && Array.isArray(data.warnings) && data.warnings.length > 0) {
        console.warn('Auth warnings:', data.warnings)
        toast.info('Signed in with warnings — check /api/debug-env for details.')
      }
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
      console.error('Google popup failed:', e)
      const errMsg = (e as Error)?.message || ''
      if (errMsg.includes('configuration-not-found') || errMsg.includes('auth/configuration-not-found')) {
        toast.error('Google Sign-In provider not enabled. Open Firebase Console → Authentication → Sign-in method → enable Google, then try again.')
      } else if (errMsg.includes('popup-closed-by-user') || errMsg.includes('cancelled')) {
        toast.info('Sign-in cancelled.')
      } else {
        toast.info('Google popup failed: ' + errMsg.substring(0, 120) + '. Falling back to email sign-in.')
        handleSignIn()
      }
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-soft">
              <div className="h-12 w-12 rounded-full bg-brand text-white font-bold inline-flex items-center justify-center text-lg">
                {(user.name || user.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{user.name || 'Eviola Customer'}</p>
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
                className="w-full flex items-center justify-between p-3 rounded-lg border border-pink-100 hover:bg-brand-soft"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-brand" /> My Orders
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              {isAdmin() && (
                <button
                  onClick={goAdmin}
                  className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-brand bg-brand-soft hover:bg-brand-soft"
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
          <CardTitle className="text-xl">Welcome to Eviola</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to track orders, save favourites and check out faster.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={handleGooglePopup}
            disabled={loading}
            className="w-full h-11 bg-white text-foreground border border-pink-200 hover:bg-brand-soft"
          >
            {loading && authMode === 'idle' ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5 mr-2" />
            )}
            {loading && authMode === 'idle' ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-pink-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or sign in with email</span>
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
              onClick={handleSignIn}
              disabled={loading || !email}
              className="w-full h-11 bg-brand text-white hover:shadow-lg"
            >
              {loading && authMode === 'custom-token' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting to Firebase...
                </>
              ) : loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {!loading && 'Sign in'}
              {loading && authMode === 'custom-token' && 'Connecting...'}
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
            By continuing you agree to Eviola's Terms of Service and Privacy Policy.
            {firebaseAvailable ? (
              <span className="block mt-1 text-emerald-600">
                Firebase Auth connected ({process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}).
              </span>
            ) : (
              <span className="block mt-1 text-amber-600">
                Demo mode — Firebase client config not set. Users are stored in the app database.
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
