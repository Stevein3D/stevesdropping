import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as xlsx from 'xlsx'

export const dynamic = 'force-dynamic'

function toExcelDate(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.round(d.getTime() / 86400000 + 25569)
}

export async function POST(request: NextRequest) {
  try {
    const { resultIds } = await request.json() as { resultIds: number[] }

    if (!resultIds?.length) {
      return NextResponse.json({ ok: false, error: 'No resultIds provided' }, { status: 400 })
    }

    const results = await prisma.scrapeResult.findMany({
      where: { id: { in: resultIds }, status: 'approved' },
    })

    const personIds = results.filter(r => r.entityType === 'person').map(r => r.entityId)
    const titleIds  = results.filter(r => r.entityType === 'title').map(r => r.entityId)

    const [people, titles] = await Promise.all([
      personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } } }) : [],
      titleIds.length  ? prisma.title.findMany({ where: { id: { in: titleIds } } }) : [],
    ])

    const personRows = people.map(p => ({
      'Person ID':           p.id,
      'Person Type':         p.personType,
      'Name':                p.name,
      'Prefix':              p.prefix ?? null,
      'First Name':          p.firstName ?? null,
      'Middle Name':         p.middleName ?? null,
      'Last Name':           p.lastName ?? null,
      'Suffix':              p.suffix ?? null,
      'Birth Name':          p.birthName ?? null,
      'Birth Date':          toExcelDate(p.birthDate),
      'Death Date':          toExcelDate(p.deathDate),
      'Nationality':         p.nationality ?? null,
      'Birthplace':          p.birthplace ?? null,
      'Industry':            p.industry ?? null,
      'Specialty':           p.specialty ?? null,
      'Bio':                 p.bio ?? null,
      'Notable Achievement': p.notableAchievement ?? null,
    }))

    const titleRows = titles.map(t => ({
      'Title ID':           t.id,
      'Title Type':         t.titleType,
      'Title Sort':         t.titleSort ?? null,
      'Title Name':         t.name,
      'Title Release Date': toExcelDate(t.releaseDate),
      'endDate':            toExcelDate(t.endDate),
      'Genre':              t.genre ?? null,
      'Title Description':  t.description ?? null,
      'Runtime (min)':      t.runtime ?? null,
      'Title Score':        t.titleScore ?? null,
    }))

    const wb = xlsx.utils.book_new()
    if (personRows.length) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(personRows), 'Person')
    }
    if (titleRows.length) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(titleRows), 'Title')
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="scrape-export-${Date.now()}.xlsx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
