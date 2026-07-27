import { NextRequest, NextResponse } from 'next/server'
import { listProducts, createProduct } from '@/lib/firestore'

// GET /api/products - list all (with optional ?search=&category=&trending=1&best=1)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.toLowerCase()
  const category = searchParams.get('category') || undefined
  const onlyTrending = searchParams.get('trending') === '1'
  const onlyBest = searchParams.get('best') === '1'

  try {
    const products = await listProducts({
      search: search || undefined,
      category,
      trending: onlyTrending,
      best: onlyBest,
    })
    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/products failed:', (e as Error).message)
    return NextResponse.json({ products: [], error: (e as Error).message }, { status: 500 })
  }
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

  try {
    const product = await createProduct({
      title,
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
      images: images?.length ? images : [],
    })
    return NextResponse.json({ product })
  } catch (e) {
    console.error('POST /api/products failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
