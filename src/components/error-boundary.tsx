'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * Global ErrorBoundary — catches render-time exceptions in any child
 * component and shows a friendly fallback UI instead of Next.js's
 * default "Application error: a client-side exception has occurred" page.
 *
 * Why this exists:
 *   The store uses zustand `persist` to keep cart/auth/UI state in
 *   localStorage. If a previous app version wrote a payload shape that
 *   the current code can't handle (e.g. `items` set to `null`), the
 *   render can throw — surfacing as the generic Next.js error page.
 *   This ErrorBoundary catches that and lets the user recover by:
 *     1. Clicking "Try again" — clears the error and re-mounts the tree.
 *     2. Clicking "Back to home" — clears ALL persisted state and
 *        reloads to the home page, fixing any corruption.
 *
 * Also clears the cart store on recovery, since the most common cause
 * of a render throw is corrupt cart data.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so the user/dev can inspect the actual stack.
    // Next.js's default error page says "see the browser console for
    // more information" — we preserve that diagnostic info here.
    console.error('[ErrorBoundary] Render exception caught:', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  hardReset = () => {
    // Clear ALL persisted store state — this is the nuclear option
    // for when corrupt localStorage data is causing the render to throw.
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('aurora-cart')
        localStorage.removeItem('aurora-ui')
        localStorage.removeItem('aurora-auth')
      } catch {
        // localStorage may be blocked — ignore
      }
      // Hard reload to home
      window.location.href = '/'
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset)
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-brand-soft flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-brand" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            We hit an unexpected error while loading this page. Your cart
            and account are safe — try again, or head back to the home page.
          </p>

          {typeof error?.message === 'string' && error.message && (
            <pre className="mb-6 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs text-left text-muted-foreground">
              <code>{error.message}</code>
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-brand text-white hover:shadow-lg"
              onClick={this.reset}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Try again
            </Button>
            <Button
              variant="outline"
              className="border-brand text-brand hover:bg-brand-soft"
              onClick={this.hardReset}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
