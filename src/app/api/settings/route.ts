import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings - returns all settings as key/value
export async function GET() {
  const rows = await db.siteSetting.findMany()
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key] = r.value
  return NextResponse.json({ settings })
}

// PUT /api/settings - body: { key, value } OR { updates: [{key,value}] }
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const updates: Array<{ key: string; value: string }> = body.updates ?? (body.key ? [body] : [])
  for (const u of updates) {
    await db.siteSetting.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value },
    })
  }
  return NextResponse.json({ ok: true })
}
