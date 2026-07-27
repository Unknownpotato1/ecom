import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.section.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const section = await db.section.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.visible !== undefined && { visible: !!body.visible }),
      ...(body.position !== undefined && { position: Number(body.position) }),
      ...(body.config !== undefined && { config: body.config }),
    },
  })
  return NextResponse.json({ section })
}
