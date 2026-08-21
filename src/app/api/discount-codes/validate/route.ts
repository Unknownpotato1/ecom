import { NextRequest, NextResponse } from 'next/server'
import { validateDiscountCode } from '@/lib/firestore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, subtotal, customerPhone } = body
    if (!code) return NextResponse.json({ valid: false, error: 'Code is required' }, { status: 400 })
    const result = await validateDiscountCode(code, Number(subtotal) || 0, customerPhone)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ valid: false, error: (e as Error).message }, { status: 500 })
  }
}
