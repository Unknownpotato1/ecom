import { NextRequest, NextResponse } from 'next/server'
import { updateCustomSection, deleteCustomSection } from '@/lib/firestore'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  try {
    await updateCustomSection(id, body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PUT /api/custom-sections/[id] failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deleteCustomSection(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/custom-sections/[id] failed:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
