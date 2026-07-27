import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, upsertSettings } from '@/lib/firestore'

// GET /api/settings - returns all settings as key/value
export async function GET() {
  try {
    const settings = await getAllSettings()
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('GET /api/settings failed:', (e as Error).message)
    return NextResponse.json({ settings: {}, error: (e as Error).message }, { status: 500 })
  }
}

// PUT /api/settings - body: { key, value } OR { updates: [{key,value}] }
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const updates: Array<{ key: string; value: string }> = body.updates ?? (body.key ? [body] : [])
  try {
    await upsertSettings(updates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/settings failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
