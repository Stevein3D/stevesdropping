import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const type = searchParams.get('type') ?? undefined

  try {
    const people = await prisma.person.findMany({
      where: {
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(type && { personType: type as any }),
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
