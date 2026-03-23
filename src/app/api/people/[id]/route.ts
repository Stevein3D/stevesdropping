import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        castings: {
          include: {
            character: true,
            title: true,
            episode: true,
          },
        },
      },
    })
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: person })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 })
  }
}
