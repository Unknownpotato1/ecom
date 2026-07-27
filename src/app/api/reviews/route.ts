import { NextRequest, NextResponse } from 'next/server'
import { createReview, type ReviewDoc, type CollectionRefLike } from '@/lib/firestore'
import { getAdmin } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || undefined
  try {
    const app = getAdmin() as unknown as { firestore?: () => { collection(p: string): CollectionRefLike } } | null
    if (!app?.firestore) return NextResponse.json({ reviews: [] })
    const db = app.firestore()
    let q: CollectionRefLike = db.collection('reviews')
    if (productId) q = q.where('productId', '==', productId)
    const snap = await q.orderBy('createdAt', 'desc').get()
    const reviews: ReviewDoc[] = snap.docs.map((d) => {
      const data = (d.data() || {}) as Record<string, unknown>
      return {
        id: d.id,
        productId: (data.productId as string) || '',
        userName: (data.userName as string) || '',
        rating: (data.rating as number) || 5,
        title: (data.title as string) || null,
        comment: (data.comment as string) || null,
        createdAt: data.createdAt instanceof Date
          ? (data.createdAt as Date).toISOString()
          : (data.createdAt as string) || new Date().toISOString(),
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
