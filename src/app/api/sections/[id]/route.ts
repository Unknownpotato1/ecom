import { NextRequest, NextResponse } from 'next/server'
import { updateSection, deleteSection } from '@/lib/firestore'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deleteSection(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/sections/[id] failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  try {
    await updateSection(id, body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/sections/[id] failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
