import { NextRequest, NextResponse } from 'next/server'
import { listSections, createSection, updateSection } from '@/lib/firestore'

// GET /api/sections - list all visible (or all with ?all=1)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  try {
    const sections = await listSections(all)
    return NextResponse.json({ sections })
  } catch (e) {
    console.error('GET /api/sections failed:', (e as Error).message)
    return NextResponse.json({ sections: [], error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/sections - create a new section
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, title, position, visible, config } = body
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })
  try {
    const section = await createSection({
      type,
      title: title ?? null,
      position,
      visible,
      config: config ?? null,
    })
    return NextResponse.json({ section })
  } catch (e) {
    console.error('POST /api/sections failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
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
  try {
    for (const item of body) {
      const updates: Record<string, unknown> = {}
      if (item.position !== undefined) updates.position = item.position
      if (item.visible !== undefined) updates.visible = item.visible
      if (item.title !== undefined) updates.title = item.title
      if (item.config !== undefined) updates.config = item.config
      if (Object.keys(updates).length > 0) {
        await updateSection(item.id, updates)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/sections failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
