import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status     = searchParams.get('status') ?? 'pending'
    const entityType = searchParams.get('entityType') ?? undefined
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize   = 25

    const where = {
      ...(status !== 'all' ? { status } : {}),
      ...(entityType ? { entityType } : {}),
    }

    const [results, total] = await Promise.all([
      prisma.scrapeResult.findMany({
        where,
        orderBy: { scrapedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scrapeResult.count({ where }),
    ])

    const personIds = results.filter(r => r.entityType === 'person').map(r => r.entityId)
    const titleIds  = results.filter(r => r.entityType === 'title').map(r => r.entityId)

    const [people, titles] = await Promise.all([
      personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }) : [],
      titleIds.length  ? prisma.title.findMany({ where: { id: { in: titleIds } }, select: { id: true, name: true, year: true } }) : [],
    ])

    const personMap = Object.fromEntries(people.map(p => [p.id, p.name]))
    const titleMap  = Object.fromEntries(titles.map(t => [t.id, `${t.name}${t.year ? ` (${t.year})` : ''}`]))

    const enriched = results.map(r => ({
      ...r,
      entityName: r.entityType === 'person' ? personMap[r.entityId] : titleMap[r.entityId],
      diffCount: Object.keys(r.diffs as object).length,
    }))

    return NextResponse.json({ ok: true, results: enriched, total, page, pageSize })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch results'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
