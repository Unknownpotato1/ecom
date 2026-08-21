import { NextRequest, NextResponse } from 'next/server'
import {
  listDiscountCodes,
  createDiscountCode,
  deleteDiscountCode,
  toggleDiscountCode,
  incrementDiscountCodeUsage,
} from '@/lib/firestore'

export async function GET() {
  try {
    const codes = await listDiscountCodes()
    return NextResponse.json(
      { codes },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (e) {
    return NextResponse.json({ codes: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, type, value, minSubtotal, usageLimit, usageLimitPerCustomer, expiresAt, active } = body
    if (!code || !type || value == null) {
      return NextResponse.json({ error: 'code, type, and value are required' }, { status: 400 })
    }
    if (type !== 'percentage' && type !== 'fixed') {
      return NextResponse.json({ error: 'type must be percentage or fixed' }, { status: 400 })
    }
    const dc = await createDiscountCode({
      code, type, value: Number(value),
      minSubtotal: Number(minSubtotal) || 0,
      usageLimit: Number(usageLimit) || 0,
      usageLimitPerCustomer: Number(usageLimitPerCustomer) || 0,
      expiresAt: expiresAt || null,
      active: active ?? true,
    })
    return NextResponse.json({ code: dc })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteDiscountCode(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    // Toggle active/inactive
    if (body.id && body.active !== undefined) {
      await toggleDiscountCode(body.id, !!body.active)
      return NextResponse.json({ ok: true })
    }
    // Increment usage counter (called when an order is placed)
    if (body.id && body.incrementUsage) {
      await incrementDiscountCodeUsage(body.id)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid PUT request' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
