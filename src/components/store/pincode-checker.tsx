'use client'

import { useState } from 'react'
import { Truck, Loader2, CheckCircle2, MapPin, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PincodeResult {
  district: string
  state: string
  deliveryDate: string
}

/**
 * Pincode delivery checker — shows on the product page only.
 * Compact, professional inline design (no heavy border/card).
 * Uses api.postalpincode.in (free, no API key).
 */
export function PincodeChecker() {
  const [pincode, setPincode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PincodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPincode = async () => {
    const pin = pincode.trim()
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter a valid 6-digit PIN')
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

        const deliveryDate = new Date()
        deliveryDate.setDate(deliveryDate.getDate() + 5)
        const formattedDate = deliveryDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })

        setResult({ district, state, deliveryDate: formattedDate })
      } else {
        setError('PIN not found')
      }
    } catch {
      setError('Could not check — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {/* Label so people know what the box is for */}
      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5 text-brand" />
        Check delivery date
      </p>
      {/* Compact inline row: input + button */}
      <div className="flex items-center gap-2">
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
          className="flex-1 h-9 text-sm"
          maxLength={6}
          inputMode="numeric"
        />
        <Button
          onClick={checkPincode}
          disabled={loading || pincode.length !== 6}
          className="h-9 bg-brand hover:shadow-lg text-white px-4 shrink-0 text-sm"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Check'}
        </Button>
      </div>

      {/* Error — inline text */}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 pl-1">{error}</p>
      )}

      {/* Result — compact inline chips */}
      {result && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-1">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <span className="text-muted-foreground">Delivering to</span>
            <span className="font-semibold">{result.district}, {result.state}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-muted-foreground">Delivery by</span>
            <span className="font-semibold text-emerald-700">{result.deliveryDate}</span>
          </span>
        </div>
      )}
    </div>
  )
}
