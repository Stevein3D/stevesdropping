import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { HistoryEvent } from '@/components/ui/TodayInHistory'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type RawRow = { id: bigint; name: string; imageUrl: string | null; year: number; month: number; day: number; updatedAt: Date }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') ?? '', 10)
  const day   = parseInt(searchParams.get('day')   ?? '', 10)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : null

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const currentYear = new Date().getFullYear()

  const [bornRows, diedRows, releasedRows] = await Promise.all([
    year !== null
      ? prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "birthDate")::int AS year,
                 EXTRACT(MONTH FROM "birthDate")::int AS month,
                 EXTRACT(DAY   FROM "birthDate")::int AS day
          FROM persons
          WHERE "birthDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "birthDate") = ${month}
            AND EXTRACT(DAY   FROM "birthDate") = ${day}
            AND EXTRACT(YEAR  FROM "birthDate") = ${year}`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "birthDate")::int AS year,
                 EXTRACT(MONTH FROM "birthDate")::int AS month,
                 EXTRACT(DAY   FROM "birthDate")::int AS day
          FROM persons
          WHERE "birthDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "birthDate") = ${month}
            AND EXTRACT(DAY   FROM "birthDate") = ${day}`,

    year !== null
      ? prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "deathDate")::int AS year,
                 EXTRACT(MONTH FROM "deathDate")::int AS month,
                 EXTRACT(DAY   FROM "deathDate")::int AS day
          FROM persons
          WHERE "deathDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "deathDate") = ${month}
            AND EXTRACT(DAY   FROM "deathDate") = ${day}
            AND EXTRACT(YEAR  FROM "deathDate") = ${year}`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "deathDate")::int AS year,
                 EXTRACT(MONTH FROM "deathDate")::int AS month,
                 EXTRACT(DAY   FROM "deathDate")::int AS day
          FROM persons
          WHERE "deathDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "deathDate") = ${month}
            AND EXTRACT(DAY   FROM "deathDate") = ${day}`,

    year !== null
      ? prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "releaseDate")::int AS year,
                 EXTRACT(MONTH FROM "releaseDate")::int AS month,
                 EXTRACT(DAY   FROM "releaseDate")::int AS day
          FROM titles
          WHERE "releaseDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "releaseDate") = ${month}
            AND EXTRACT(DAY   FROM "releaseDate") = ${day}
            AND EXTRACT(YEAR  FROM "releaseDate") = ${year}`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "releaseDate")::int AS year,
                 EXTRACT(MONTH FROM "releaseDate")::int AS month,
                 EXTRACT(DAY   FROM "releaseDate")::int AS day
          FROM titles
          WHERE "releaseDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "releaseDate") = ${month}
            AND EXTRACT(DAY   FROM "releaseDate") = ${day}`,
  ])

  function toEvent(row: RawRow, type: HistoryEvent['type'], hrefBase: string): HistoryEvent {
    return {
      type,
      year: Number(row.year),
      yearsAgo: currentYear - Number(row.year),
      name: row.name,
      imageUrl: row.imageUrl,
      imageVersion: row.updatedAt ? Math.floor(new Date(row.updatedAt).getTime() / 1000) : null,
      href: `${hrefBase}/${Number(row.id)}`,
      day: Number(row.day),
      displayDate: `${MONTH_SHORT[Number(row.month) - 1]} ${Number(row.day)}`,
    }
  }

  const events: HistoryEvent[] = [
    ...bornRows.map(r    => toEvent(r, 'born',     '/people')),
    ...diedRows.map(r    => toEvent(r, 'died',     '/people')),
    ...releasedRows.map(r => toEvent(r, 'released', '/titles')),
  ].sort((a, b) => a.year - b.year)

  return NextResponse.json(events)
}
