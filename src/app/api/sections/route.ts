import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sections - list all visible (or all with ?all=1)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const sections = await db.section.findMany({
    orderBy: { position: 'asc' },
    ...(all ? {} : { where: { visible: true } }),
  })
  return NextResponse.json({ sections })
}

// POST /api/sections - create a new section
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, title, position, visible, config } = body
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })
  const maxPos = await db.section.aggregate({ _max: { position: true } })
  const section = await db.section.create({
    data: {
      type,
      title: title ?? null,
      position: position ?? (maxPos._max.position ?? -1) + 1,
      visible: visible ?? true,
      config: config ?? null,
    },
  })
  return NextResponse.json({ section })
}

// PUT /api/sections - bulk update positions / visibility
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Array<{
    id: string
    position?: number
    visible?: boolean
    title?: string
    config?: string | null
  }>
  for (const item of body) {
    await db.section.update({
      where: { id: item.id },
      data: {
        ...(item.position !== undefined && { position: item.position }),
        ...(item.visible !== undefined && { visible: item.visible }),
        ...(item.title !== undefined && { title: item.title }),
        ...(item.config !== undefined && { config: item.config }),
      },
    })
  }
  return NextResponse.json({ ok: true })
}
