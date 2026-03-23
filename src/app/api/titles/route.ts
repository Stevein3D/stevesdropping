import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? undefined
  const search = searchParams.get('search') ?? ''

  try {
    const titles = await prisma.title.findMany({
      where: {
        ...(type && { titleType: type as any }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        castings: {
          include: {
            person: true,
            character: true,
          },
        },
        episodes: { orderBy: [{ season: 'asc' }, { episodeNumber: 'asc' }] },
      },
      orderBy: { year: 'desc' },
    })
    return NextResponse.json({ data: titles })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch titles' }, { status: 500 })
  }
}
