'use client'

import { useState } from 'react'
import { MapPin, Truck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PincodeResult {
  district: string
  state: string
  deliveryDate: string
}

/**
 * Pincode delivery checker — shows on the product page only.
 * Uses the free Indian Postal PIN code lookup API (api.postalpincode.in)
 * to fetch district and state. Delivery date is 5 days from today.
 */
export function PincodeChecker() {
  const [pincode, setPincode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PincodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPincode = async () => {
    const pin = pincode.trim()
    if (!/^\d{6}$/.test(pin)) {
      setError('Please enter a valid 6-digit PIN code')
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const data = await res.json()
      
      if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const district = postOffice.District || postOffice.Block || '—'
        const state = postOffice.State || '—'
        
        // Calculate delivery date: 5 days from today
        const deliveryDate = new Date()
        deliveryDate.setDate(deliveryDate.getDate() + 5)
        const formattedDate = deliveryDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })

        setResult({ district, state, deliveryDate: formattedDate })
      } else {
        setError('PIN code not found. Please check and try again.')
      }
    } catch {
      setError('Could not check PIN code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-pink-200 bg-brand-soft/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-brand" />
        <h4 className="text-sm font-semibold">Check delivery date</h4>
      </div>
      
      <div className="flex gap-2">
        <Input
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
            setError(null)
            setResult(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              checkPincode()
            }
          }}
          placeholder="Enter 6-digit PIN code"
          className="flex-1 h-10"
          maxLength={6}
          inputMode="numeric"
        />
        <Button
          onClick={checkPincode}
          disabled={loading || pincode.length !== 6}
          className="h-10 bg-brand hover:shadow-lg text-white px-5 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-3 rounded-lg bg-white border border-pink-100 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-brand mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Delivering to: </span>
              <span className="font-semibold">{result.district}, {result.state}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Expected delivery by: </span>
              <span className="font-semibold text-emerald-700">{result.deliveryDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
