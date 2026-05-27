import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapePerson } from '@/lib/scrapers/wikipedia'
import { scrapeTitle } from '@/lib/scrapers/tmdb'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      entityType: 'person' | 'title'
      filter: 'all' | 'empty'
      entityIds?: number[]
    }

    const { entityType, filter, entityIds } = body

    if (!['person', 'title'].includes(entityType)) {
      return NextResponse.json({ ok: false, error: 'Invalid entityType' }, { status: 400 })
    }

    let created = 0
    let skipped = 0

    if (entityType === 'person') {
      const where = entityIds?.length
        ? { id: { in: entityIds } }
        : filter === 'empty'
        ? { bio: null }
        : {}

      const people = await prisma.person.findMany({
        where,
        select: { id: true, name: true, bio: true, nationality: true, birthplace: true, imageUrl: true, birthDate: true, birthYear: true, deathDate: true, deathYear: true },
        take: 50,
      })

      await runConcurrent(people, 5, async (person) => {
        const output = await scrapePerson(person)
        if (!output) {
          await prisma.scrapeResult.create({
            data: { entityType: 'person', entityId: person.id, status: 'not_found', source: 'wikipedia', diffs: {} },
          })
          skipped++
          return
        }
        await prisma.scrapeResult.create({
          data: { entityType: 'person', entityId: person.id, status: 'pending', source: output.source, diffs: output.diffs },
        })
        created++
      })
    } else {
      const where = entityIds?.length
        ? { id: { in: entityIds } }
        : filter === 'empty'
        ? { description: null }
        : {}

      const titles = await prisma.title.findMany({
        where,
        select: { id: true, name: true, year: true, description: true, genre: true, imageUrl: true, runtime: true, releaseDate: true, titleType: true },
        take: 50,
      })

      await runConcurrent(titles, 5, async (title) => {
        const output = await scrapeTitle(title)
        if (!output) {
          await prisma.scrapeResult.create({
            data: { entityType: 'title', entityId: title.id, status: 'not_found', source: 'tmdb', diffs: {} },
          })
          skipped++
          return
        }
        await prisma.scrapeResult.create({
          data: { entityType: 'title', entityId: title.id, status: 'pending', source: output.source, diffs: output.diffs },
        })
        created++
      })
    }

    return NextResponse.json({ ok: true, created, skipped })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
