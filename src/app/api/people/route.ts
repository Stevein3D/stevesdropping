import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { personTypeFilter } from '@/lib/personTypes'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const type = searchParams.get('type') ?? undefined

  try {
    const people = await prisma.person.findMany({
      where: {
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(type && personTypeFilter(type)),
      },
      include: {
        castings: {
          include: {
            character: true,
            title: true,
            episode: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: people })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch people' }, { status: 500 })
  }
}
