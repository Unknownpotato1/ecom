import { NextRequest, NextResponse } from 'next/server'
import { listCollections, createCollection } from '@/lib/firestore'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  try {
    const collections = await listCollections(all)
    return NextResponse.json({ collections })
  } catch (e) {
    return NextResponse.json({ collections: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, productIds, featuredProductIds, visible } = body
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  try {
    const collection = await createCollection({
      name,
      productIds: productIds || [],
      featuredProductIds: featuredProductIds || [],
      visible: visible ?? true,
    })
    return NextResponse.json({ collection })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
