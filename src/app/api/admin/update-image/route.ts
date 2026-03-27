import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Entity = 'person' | 'character' | 'title' | 'casting'

export async function POST(request: NextRequest) {
  const { entity, id, url }: { entity: Entity; id: number; url: string } = await request.json()

  if (!entity || !id || !url) {
    return NextResponse.json({ error: 'Missing entity, id, or url' }, { status: 400 })
  }

  switch (entity) {
    case 'person':
      await prisma.person.update({ where: { id }, data: { imageUrl: url } })
      break
    case 'character':
      await prisma.character.update({ where: { id }, data: { imageUrl: url } })
      break
    case 'title':
      await prisma.title.update({ where: { id }, data: { imageUrl: url } })
      break
    case 'casting':
      await prisma.casting.update({ where: { id }, data: { imageUrl: url } })
      break
    default:
      return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
