import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const result = await prisma.scrapeResult.findUnique({ where: { id } })
    if (!result) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    if (result.status === 'pending') {
      return NextResponse.json({ ok: false, error: 'Already pending' }, { status: 409 })
    }

    await prisma.scrapeResult.update({
      where: { id },
      data: { status: 'pending', approvedFields: [], reviewedAt: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Revert failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
