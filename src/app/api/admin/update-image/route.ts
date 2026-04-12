import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imagekit } from '@/lib/imagekit'

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

  // Purge CDN cache — base URL and the transformed thumbnail variant
  const baseUrl  = url.split('?')[0]
  const thumbUrl = `${baseUrl}?tr=w-200,q-70`
  Promise.all([
    imagekit.purgeCache(baseUrl),
    imagekit.purgeCache(thumbUrl),
  ])
    .then(([r1, r2]) => console.log('[imagekit purge]', baseUrl, r1, r2))
    .catch((e) => console.error('[imagekit purge failed]', e))

  return NextResponse.json({ ok: true })
}
