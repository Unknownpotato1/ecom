import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: 'asc' } },
      reviews: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    rating,
    reviewCount,
  } = body

  // Replace images if provided
  if (Array.isArray(images)) {
    await db.productImage.deleteMany({ where: { productId: id } })
    if (images.length) {
      await db.productImage.createMany({
        data: images.map((img: { url: string; alt?: string }, i: number) => ({
          productId: id,
          url: img.url,
          alt: img.alt ?? null,
          position: i,
        })),
      })
    }
  }

  const product = await db.product.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(longDescription !== undefined && { longDescription }),
      ...(price !== undefined && { price: Number(price) }),
      ...(comparedPrice !== undefined && {
        comparedPrice: comparedPrice ? Number(comparedPrice) : null,
      }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(category !== undefined && { category }),
      ...(isTrending !== undefined && { isTrending: !!isTrending }),
      ...(isBestSeller !== undefined && { isBestSeller: !!isBestSeller }),
      ...(specifications !== undefined && { specifications }),
      ...(tags !== undefined && { tags }),
      ...(rating !== undefined && { rating: Number(rating) }),
      ...(reviewCount !== undefined && { reviewCount: Number(reviewCount) }),
    },
    include: { images: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json({ product })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
