import { NextRequest, NextResponse } from 'next/server'
import { createReview, type ReviewDoc } from '@/lib/firestore'
import { getAdmin } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  try {
    const admin = getAdmin()
    if (!admin) return NextResponse.json({ reviews: [] })
    let q = admin.firestore().collection('reviews')
    if (productId) q = q.where('productId', '==', productId)
    const snap = await q.orderBy('createdAt', 'desc').get()
    const reviews: ReviewDoc[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        productId: data.productId || '',
        userName: data.userName || '',
        rating: data.rating || 5,
        title: data.title || null,
        comment: data.comment || null,
        createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
      } as ReviewDoc
    })
    return NextResponse.json({ reviews })
  } catch (e) {
    console.error('GET /api/reviews failed:', (e as Error).message)
    return NextResponse.json({ reviews: [], error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { productId, userName, rating, title, comment } = body
  if (!productId || !userName || !rating) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  try {
    const review = await createReview({
      productId,
      userName,
      rating: Number(rating),
      title: title ?? null,
      comment: comment ?? null,
    })
    return NextResponse.json({ review })
  } catch (e) {
    console.error('POST /api/reviews failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
