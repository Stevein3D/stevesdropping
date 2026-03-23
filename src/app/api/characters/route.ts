import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      include: {
        castings: {
          include: {
            person: true,
            title: true,
            episode: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: characters })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }
}
