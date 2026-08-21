import { NextRequest, NextResponse } from 'next/server'
import { getPage, updatePage, deletePage } from '@/lib/firestore'
import { RESERVED_PAGE_SLUGS, slugify } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const page = await getPage(id)
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ page })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = { ...body }
  if (typeof updates.slug === 'string' && updates.slug.trim() !== '') {
    const finalSlug = slugify(updates.slug)
    if (!finalSlug) {
      return NextResponse.json({ error: 'slug must contain at least one letter or digit' }, { status: 400 })
    }
    if ((RESERVED_PAGE_SLUGS as readonly string[]).includes(finalSlug)) {
      return NextResponse.json(
        { error: `The slug "/${finalSlug}" is reserved and cannot be used for a custom page.` },
        { status: 400 }
      )
    }
    updates.slug = finalSlug
  }
  delete updates.id
  delete updates.createdAt
  try {
    await updatePage(id, updates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deletePage(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
