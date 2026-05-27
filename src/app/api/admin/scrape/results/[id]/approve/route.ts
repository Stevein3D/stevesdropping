import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ScrapeResultDiffs } from '@/lib/scrapers/types'

const INT_FIELDS = new Set(['year', 'runtime', 'birthYear', 'deathYear'])
const DATE_FIELDS = new Set(['birthDate', 'deathDate', 'releaseDate'])

function coerce(field: string, value: string | null): unknown {
  if (value === null || value === '') return null
  if (INT_FIELDS.has(field)) { const n = parseInt(value); return isNaN(n) ? null : n }
  if (DATE_FIELDS.has(field)) { const d = new Date(value); return isNaN(d.getTime()) ? null : d }
  return value
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { approvedFields, edits } = await request.json() as {
      approvedFields: string[]
      edits?: Record<string, string>
    }

    const result = await prisma.scrapeResult.findUnique({ where: { id } })
    if (!result) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    if (result.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'Already reviewed' }, { status: 409 })
    }

    const diffs = result.diffs as ScrapeResultDiffs

    const updateData: Record<string, unknown> = {}
    for (const field of approvedFields) {
      const d = diffs[field]
      if (!d) continue
      const raw = edits?.[field] ?? d.scraped
      updateData[field] = coerce(field, raw)
    }

    if (Object.keys(updateData).length > 0) {
      if (result.entityType === 'person') {
        await prisma.person.update({ where: { id: result.entityId }, data: updateData })
      } else {
        await prisma.title.update({ where: { id: result.entityId }, data: updateData })
      }
    }

    await prisma.scrapeResult.update({
      where: { id },
      data: {
        status: 'approved',
        approvedFields,
        reviewedAt: new Date(),
        diffs: Object.fromEntries(
          Object.entries(diffs).map(([k, v]) => [
            k,
            approvedFields.includes(k) ? { ...v, edited: edits?.[k] ?? null } : v,
          ])
        ),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Approve failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
