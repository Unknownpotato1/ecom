import { NextRequest, NextResponse } from 'next/server'
import { listPages, createPage } from '@/lib/firestore'
import { RESERVED_PAGE_SLUGS, slugify } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  try {
    const pages = await listPages(all)
    return NextResponse.json({ pages })
  } catch (e) {
    return NextResponse.json({ pages: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, slug, code, published } = body
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  const finalSlug = slugify(slug || title)
  if (!finalSlug) {
    return NextResponse.json({ error: 'slug must contain at least one letter or digit' }, { status: 400 })
  }
  if ((RESERVED_PAGE_SLUGS as readonly string[]).includes(finalSlug)) {
    return NextResponse.json(
      { error: `The slug "/${finalSlug}" is reserved and cannot be used for a custom page. Please choose a different slug.` },
      { status: 400 }
    )
  }
  try {
    const page = await createPage({
      title: title.trim(),
      slug: finalSlug,
      code: typeof code === 'string' ? code : '',
      published: published ?? true,
    })
    return NextResponse.json({ page })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
