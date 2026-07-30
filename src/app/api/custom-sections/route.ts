import { NextRequest, NextResponse } from 'next/server'
import { listCustomSections, createCustomSection, updateCustomSection } from '@/lib/firestore'

export async function GET() {
  try {
    const sections = await listCustomSections()
    return NextResponse.json({ sections })
  } catch (e) {
    console.error('GET /api/custom-sections failed:', (e as Error).message)
    return NextResponse.json({ sections: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, code, html, css, js, position, visible, slot, location } = body
  // Title is no longer required — custom sections render content only,
  // no heading. We accept an empty string for backward schema compatibility.
  // Require at least code (or legacy html) so the section isn't empty.
  if (!code && !html) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }
  try {
    const section = await createCustomSection({
      title: title || '', // kept for schema compatibility; not rendered
      code: code || '',
      html: html || '',
      css: css ?? null,
      js: js ?? null,
      position,
      visible,
      slot: slot || location || 'storefront',
      location,
    })
    return NextResponse.json({ section })
  } catch (e) {
    console.error('POST /api/custom-sections failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Array<{
    id: string
    position?: number
    visible?: boolean
  }>
  try {
    for (const item of body) {
      const updates: Record<string, unknown> = {}
      if (item.position !== undefined) updates.position = item.position
      if (item.visible !== undefined) updates.visible = item.visible
      if (Object.keys(updates).length > 0) {
        await updateCustomSection(item.id, updates)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/custom-sections failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
