import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { entity, id, featured } = await request.json()

    if (!entity || typeof id !== 'number' || typeof featured !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    switch (entity) {
      case 'person':
        await prisma.person.update({ where: { id }, data: { featured } })
        break
      case 'character':
        await prisma.character.update({ where: { id }, data: { featured } })
        break
      case 'title':
        await prisma.title.update({ where: { id }, data: { featured } })
        break
      default:
        return NextResponse.json({ ok: false, error: 'Unsupported entity' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Toggle failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
