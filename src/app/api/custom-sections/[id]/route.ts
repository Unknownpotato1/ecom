import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const section = await db.customSection.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.html !== undefined && { html: body.html }),
      ...(body.css !== undefined && { css: body.css }),
      ...(body.js !== undefined && { js: body.js }),
      ...(body.position !== undefined && { position: Number(body.position) }),
      ...(body.visible !== undefined && { visible: !!body.visible }),
    },
  })
  return NextResponse.json({ section })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.customSection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
