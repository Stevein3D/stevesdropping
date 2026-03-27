import { NextRequest, NextResponse } from 'next/server'
import * as xlsx from 'xlsx'
import { prisma } from '@/lib/prisma'
import { PersonType, CharacterType, TitleType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// ─── Row types matching the XLSX sheet columns ──────────────────────────────

type PersonRow = {
  'Person ID': number
  'Name': string
  'Person Type': string
  'Birth Year': number | null
  'Death Year': number | null
  'Nationality': string | null
  'Bio': string | null
}

type CharacterRow = {
  'Character ID': number
  'Character Name': string
  'Character Type': string
  'Description': string | null
}

type TitleRow = {
  'Title ID': number
  'Title Name': string
  'Year': number | null
  'Type': string
  'Genre': string | null
  'Description': string | null
  'Runtime (min)': number | null
}

type EpisodeRow = {
  'Episode ID': number
  'Title ID': number
  'Season': number | null
  'Episode Number': number | null
  'Episode Title': string | null
  'Description': string | null
  'Runtime (min)': number | null
}

type CastingRow = {
  'Casting ID': number
  'Person ID': number
  'Character ID': number
  'Title ID': number
  'Episode ID': number | null
  'Notes': string | null
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function getSheet<T>(wb: xlsx.WorkBook, name: string): T[] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`Sheet "${name}" not found in workbook`)
  return xlsx.utils.sheet_to_json<T>(ws, { defval: null })
}

function toEnum<T extends string>(value: string, fallback: T): T {
  return (value ?? fallback) as T
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = xlsx.read(buffer, { type: 'buffer' })

    // ── Parse sheets ────────────────────────────────────────────────────────

    const personRows    = getSheet<PersonRow>(wb, 'Person')
    const characterRows = getSheet<CharacterRow>(wb, 'Character')
    const titleRows     = getSheet<TitleRow>(wb, 'Title')
    const episodeRows   = getSheet<EpisodeRow>(wb, 'Episode')
    const castingRows   = getSheet<CastingRow>(wb, 'Casting')

    // ── Upsert in dependency order ───────────────────────────────────────────

    for (const row of personRows) {
      await prisma.person.upsert({
        where: { id: row['Person ID'] },
        update: {
          name:        row['Name'],
          personType:  toEnum<PersonType>(row['Person Type'], 'actor'),
          birthYear:   row['Birth Year'],
          deathYear:   row['Death Year'],
          nationality: row['Nationality'],
          bio:         row['Bio'],
        },
        create: {
          id:          row['Person ID'],
          name:        row['Name'],
          personType:  toEnum<PersonType>(row['Person Type'], 'actor'),
          birthYear:   row['Birth Year'],
          deathYear:   row['Death Year'],
          nationality: row['Nationality'],
          bio:         row['Bio'],
        },
      })
    }

    for (const row of characterRows) {
      await prisma.character.upsert({
        where: { id: row['Character ID'] },
        update: {
          name:          row['Character Name'],
          characterType: toEnum<CharacterType>(row['Character Type'], 'other'),
          description:   row['Description'],
        },
        create: {
          id:            row['Character ID'],
          name:          row['Character Name'],
          characterType: toEnum<CharacterType>(row['Character Type'], 'other'),
          description:   row['Description'],
        },
      })
    }

    for (const row of titleRows) {
      await prisma.title.upsert({
        where: { id: row['Title ID'] },
        update: {
          name:        row['Title Name'],
          year:        row['Year'],
          titleType:   toEnum<TitleType>(row['Type'], 'other'),
          genre:       row['Genre'],
          description: row['Description'],
          runtime:     row['Runtime (min)'],
        },
        create: {
          id:          row['Title ID'],
          name:        row['Title Name'],
          year:        row['Year'],
          titleType:   toEnum<TitleType>(row['Type'], 'other'),
          genre:       row['Genre'],
          description: row['Description'],
          runtime:     row['Runtime (min)'],
        },
      })
    }

    for (const row of episodeRows) {
      await prisma.episode.upsert({
        where: { id: row['Episode ID'] },
        update: {
          titleId:       row['Title ID'],
          season:        row['Season'],
          episodeNumber: row['Episode Number'],
          episodeTitle:  row['Episode Title'],
          description:   row['Description'],
          runtime:       row['Runtime (min)'],
        },
        create: {
          id:            row['Episode ID'],
          titleId:       row['Title ID'],
          season:        row['Season'],
          episodeNumber: row['Episode Number'],
          episodeTitle:  row['Episode Title'],
          description:   row['Description'],
          runtime:       row['Runtime (min)'],
        },
      })
    }

    for (const row of castingRows) {
      await prisma.casting.upsert({
        where: { id: row['Casting ID'] },
        update: {
          personId:    row['Person ID'],
          characterId: row['Character ID'],
          titleId:     row['Title ID'],
          episodeId:   row['Episode ID'],
          notes:       row['Notes'],
        },
        create: {
          id:          row['Casting ID'],
          personId:    row['Person ID'],
          characterId: row['Character ID'],
          titleId:     row['Title ID'],
          episodeId:   row['Episode ID'],
          notes:       row['Notes'],
        },
      })
    }

    return NextResponse.json({
      ok: true,
      summary: {
        people:     personRows.length,
        characters: characterRows.length,
        titles:     titleRows.length,
        episodes:   episodeRows.length,
        castings:   castingRows.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
