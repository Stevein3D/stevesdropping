import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
      revalidatePath(`/people/${id}`)
      revalidatePath('/people')
      revalidatePath('/')
      break
    case 'character':
      await prisma.character.update({ where: { id }, data: { imageUrl: url } })
      revalidatePath(`/characters/${id}`)
      revalidatePath('/characters')
      revalidatePath('/')
      break
    case 'title':
      await prisma.title.update({ where: { id }, data: { imageUrl: url } })
      revalidatePath(`/titles/${id}`)
      revalidatePath('/titles')
      revalidatePath('/')
      break
    case 'casting': {
      await prisma.casting.update({ where: { id }, data: { imageUrl: url } })
      const casting = await prisma.casting.findUnique({
        where: { id },
        select: { personId: true, titleId: true, characterId: true },
      })
      if (casting) {
        revalidatePath(`/people/${casting.personId}`)
        revalidatePath(`/titles/${casting.titleId}`)
        revalidatePath(`/characters/${casting.characterId}`)
      }
      break
    }
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
