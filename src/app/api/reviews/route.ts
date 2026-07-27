import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const reviews = await db.review.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reviews })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { productId, userName, rating, title, comment } = body
  if (!productId || !userName || !rating) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const review = await db.review.create({
    data: {
      productId,
      userName,
      rating: Number(rating),
      title: title ?? null,
      comment: comment ?? null,
    },
  })

  // Update product aggregate
  const all = await db.review.findMany({ where: { productId } })
  const avg = all.reduce((s, r) => s + r.rating, 0) / all.length
  await db.product.update({
    where: { id: productId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: all.length },
  })

  return NextResponse.json({ review })
}
