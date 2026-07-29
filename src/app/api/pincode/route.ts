import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/pincode?pin=560001
 * Server-side proxy for the Indian Postal PIN code lookup API.
 * Avoids CORS issues when calling api.postalpincode.in from browser JS
 * (e.g. inside custom sections).
 *
 * Returns: { status, district, state } or { error }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pin = searchParams.get('pin')

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()

    if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const office = data[0].PostOffice[0]
      return NextResponse.json({
        status: 'Success',
        district: office.District || office.Block || '',
        state: office.State || '',
      })
    }

    return NextResponse.json({ status: 'Error', error: 'PIN not found' })
  } catch {
    return NextResponse.json({ error: 'Could not reach postal API' }, { status: 502 })
  }
}
