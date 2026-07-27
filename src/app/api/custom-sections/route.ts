import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const sections = await db.customSection.findMany({
    orderBy: { position: 'asc' },
  })
  return NextResponse.json({ sections })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, html, css, js, position, visible } = body
  if (!title || !html) {
    return NextResponse.json({ error: 'title and html required' }, { status: 400 })
  }
  const maxPos = await db.customSection.aggregate({ _max: { position: true } })
  const section = await db.customSection.create({
    data: {
      title,
      html,
      css: css ?? null,
      js: js ?? null,
      position: position ?? (maxPos._max.position ?? -1) + 1,
      visible: visible ?? true,
    },
  })
  return NextResponse.json({ section })
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Array<{
    id: string
    position?: number
    visible?: boolean
  }>
  for (const item of body) {
    await db.customSection.update({
      where: { id: item.id },
      data: {
        ...(item.position !== undefined && { position: item.position }),
        ...(item.visible !== undefined && { visible: item.visible }),
      },
    })
  }
  return NextResponse.json({ ok: true })
}
