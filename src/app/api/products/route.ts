import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// GET /api/products - list all (with optional ?search=&category=)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.toLowerCase()
  const category = searchParams.get('category')
  const onlyTrending = searchParams.get('trending') === '1'
  const onlyBest = searchParams.get('best') === '1'

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ]
  }
  if (category) where.category = category
  if (onlyTrending) where.isTrending = true
  if (onlyBest) where.isBestSeller = true

  const products = await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json({ products })
}

// POST /api/products - create (admin)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    title,
    description,
    longDescription,
    price,
    comparedPrice,
    stock,
    category,
    isTrending,
    isBestSeller,
    specifications,
    tags,
    images,
  } = body

  if (!title || !description || price == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`
  }

  const product = await db.product.create({
    data: {
      title,
      slug,
      description,
      longDescription: longDescription ?? null,
      price: Number(price),
      comparedPrice: comparedPrice ? Number(comparedPrice) : null,
      stock: Number(stock ?? 0),
      category: category ?? null,
      isTrending: !!isTrending,
      isBestSeller: !!isBestSeller,
      specifications: specifications ?? null,
      tags: tags ?? null,
      images: images?.length
        ? { create: images.map((img: { url: string; alt?: string }, i: number) => ({ url: img.url, alt: img.alt ?? null, position: i })) }
        : undefined,
    },
    include: { images: true },
  })
  return NextResponse.json({ product })
}
