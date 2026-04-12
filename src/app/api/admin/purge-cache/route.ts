import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imagekit } from '@/lib/imagekit'

export const dynamic = 'force-dynamic'

type Entity = 'person' | 'character' | 'title' | 'casting'

const TABLE_MAP: Record<Entity, () => Promise<{ imageUrl: string | null }[]>> = {
  person:    () => prisma.person.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
  character: () => prisma.character.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
  title:     () => prisma.title.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
  casting:   () => prisma.casting.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
}

export async function POST(request: NextRequest) {
  const { entity }: { entity: Entity } = await request.json()

  if (!entity || !TABLE_MAP[entity]) {
    return NextResponse.json({ ok: false, error: 'Invalid entity' }, { status: 400 })
  }

  const records = await TABLE_MAP[entity]()
  const urls = records.map((r) => r.imageUrl!).filter(Boolean)

  // Purge base + thumbnail transform for each URL
  const purgeTargets = urls.flatMap((url) => {
    const base = url.split('?')[0]
    return [base, `${base}?tr=w-200,q-70`]
  })

  let purged = 0
  let failed = 0

  // ImageKit purge requests must be sequential to avoid rate limiting
  for (const url of purgeTargets) {
    try {
      await imagekit.purgeCache(url)
      purged++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, purged, failed, total: purgeTargets.length })
}
