import { NextRequest, NextResponse } from 'next/server'
import * as xlsx from 'xlsx'
import { prisma } from '@/lib/prisma'
import { PersonType, CharacterType, TitleType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// ─── Row types matching the XLSX sheet columns ──────────────────────────────

type PersonRow = {
  'Person ID':           number
  'Name':                string
  'Person Type':         string
  'Prefix':              string | null
  'First Name':          string | null
  'Middle Name':         string | null
  'Last Name':           string | null
  'Suffix':              string | null
  'Birth Name':          string | null
  'Birth Date':          number | null  // Excel serial date
  'Death Date':          number | null  // Excel serial date
  'Nationality':         string | null
  'Birthplace':          string | null
  'Industry':            string | null
  'Specialty':           string | null
  'Bio':                 string | null
  'Notable Achievement': string | null
}

type CharacterRow = {
  'Character ID':   number
  'Character Name': string
  'Character Type': string
  'Description':    string | null
}

type TitleRow = {
  'Title ID':           number
  'Title Type':         string
  'Title Sort':         string | null
  'Title Name':         string
  'Title Release Date': number | null  // Excel serial date
  'Genre':              string | null
  'Title Description':  string | null
  'Runtime (min)':      number | null
  'Title Score':        number | null
}

type EpisodeRow = {
  'Episode ID':           number
  'Title ID':             number
  'Season':               number | null
  'Episode Number':       number | null
  'Episode Title':        string | null
  'Episode Description':  string | null
  'Episode Release Date': number | null  // Excel serial date
  'Runtime (min)':        number | null
  'Episode Score':        number | null
}

type CastingRow = {
  'Casting ID':   number
  'Person ID':    number
  'Character ID': number
  'Title ID':     number
  'Episode ID':   number | null
  'Notes':        string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSheet<T>(wb: xlsx.WorkBook, name: string): T[] {
  const ws = wb.Sheets[name]
  if (!ws) return []
  return xlsx.utils.sheet_to_json<T>(ws, { defval: null })
}

// Convert Excel serial date to JS Date (accounts for Excel's 1900 leap year bug)
function excelDate(serial: number | null): Date | null {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date((serial - 25569) * 86400 * 1000)
  return isNaN(d.getTime()) ? null : d
}

function excelYear(serial: number | null): number | null {
  const d = excelDate(serial)
  return d ? d.getUTCFullYear() : null
}

// Strip trailing year from title names e.g. "Foo (2018-2019)" → "Foo"
function stripYear(name: string | null): string | null {
  if (!name) return null
  return name.replace(/\s*\(\d{4}(?:-\d{4})?\)\s*$/, '').trim()
}

const TITLE_TYPE_MAP: Record<string, TitleType> = {
  'Film':          'film',
  'TV Series':     'tv_series',
  'TV Movie':      'tv_movie',
  'TV Miniseries': 'tv_miniseries',
  'Animated':      'animated',
  'Short':         'short',
  'Documentary':   'documentary',
  'Video':         'video',
}

function toTitleType(raw: string): TitleType {
  return TITLE_TYPE_MAP[raw] ?? 'other'
}

const PERSON_TYPE_MAP: Record<string, PersonType> = {
  'actor':              'actor',
  'artist':             'artist',
  'author':             'author',
  'celebrity':          'celebrity',
  'comedian':           'comedian',
  'composer':           'composer',
  'director':           'director',
  'filmmaker':          'filmmaker',
  'inventor':           'inventor',
  'musician':           'musician',
  'writer':             'writer',
  // sports → athlete
  'athlete':            'athlete',
  'baseball player':    'athlete',
  'basketball player':  'athlete',
  'cricketer':          'athlete',
  'football player':    'athlete',
  'snooker player':     'athlete',
  // catch-all
  'character':          'other',
  'conservationist':    'other',
  'cosmologist':        'other',
}

function toPersonType(value: string | null): PersonType {
  return PERSON_TYPE_MAP[value?.toLowerCase() ?? ''] ?? 'other'
}

function toEnum<T extends string>(value: string | null, fallback: T): T {
  return ((value ?? fallback) as T)
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

    const personRows    = getSheet<PersonRow>(wb, 'Person')
    const characterRows = getSheet<CharacterRow>(wb, 'Character')
    const titleRows     = getSheet<TitleRow>(wb, 'Title')
    const episodeRows   = getSheet<EpisodeRow>(wb, 'Episode')
    const castingRows   = getSheet<CastingRow>(wb, 'Casting')

    type RowError = { entity: string; id: number | string; error: string }
    const errors: RowError[] = []

    // ── People ───────────────────────────────────────────────────────────────

    for (const row of personRows) {
      const id = row['Person ID']
      try {
        const data = {
          name:               row['Name'],
          personType:         toPersonType(row['Person Type']),
          prefix:             row['Prefix'],
          firstName:          row['First Name'],
          middleName:         row['Middle Name'],
          lastName:           row['Last Name'],
          suffix:             row['Suffix'],
          birthName:          row['Birth Name'],
          birthDate:          excelDate(row['Birth Date']),
          deathDate:          excelDate(row['Death Date']),
          birthYear:          excelYear(row['Birth Date']),
          deathYear:          excelYear(row['Death Date']),
          nationality:        row['Nationality'],
          birthplace:         row['Birthplace'],
          industry:           row['Industry'],
          specialty:          row['Specialty'],
          bio:                row['Bio'],
          notableAchievement: row['Notable Achievement'],
        }
        const exists = await prisma.person.findUnique({ where: { id }, select: { id: true } })
        if (exists) {
          await prisma.person.update({ where: { id }, data })
        } else {
          await prisma.person.create({ data: { id, ...data } })
        }
      } catch (err) {
        errors.push({ entity: 'person', id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // ── Characters ───────────────────────────────────────────────────────────

    for (const row of characterRows) {
      const id = row['Character ID']
      try {
        const data = {
          name:          row['Character Name'],
          characterType: toEnum<CharacterType>(row['Character Type'], 'other'),
          description:   row['Description'],
        }
        const exists = await prisma.character.findUnique({ where: { id }, select: { id: true } })
        if (exists) {
          await prisma.character.update({ where: { id }, data })
        } else {
          await prisma.character.create({ data: { id, ...data } })
        }
      } catch (err) {
        errors.push({ entity: 'character', id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // ── Titles ───────────────────────────────────────────────────────────────

    for (const row of titleRows) {
      const id = row['Title ID']
      try {
        const releaseDate = excelDate(row['Title Release Date'])
        const rawRuntime  = row['Runtime (min)']
        const data = {
          name:        stripYear(row['Title Name']) ?? row['Title Name'],
          titleSort:   stripYear(row['Title Sort']),
          year:        releaseDate ? releaseDate.getUTCFullYear() : null,
          releaseDate,
          titleType:   toTitleType(row['Title Type']),
          genre:       row['Genre'],
          description: row['Title Description'],
          runtime:     (rawRuntime != null && !isNaN(Number(rawRuntime))) ? Number(rawRuntime) : null,
          titleScore:  row['Title Score'] ? Number(row['Title Score']) : null,
        }
        const exists = await prisma.title.findUnique({ where: { id }, select: { id: true } })
        if (exists) {
          await prisma.title.update({ where: { id }, data })
        } else {
          await prisma.title.create({ data: { id, ...data } })
        }
      } catch (err) {
        errors.push({ entity: 'title', id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // ── Episodes ─────────────────────────────────────────────────────────────

    for (const row of episodeRows) {
      const id = row['Episode ID']
      try {
        const rawRuntime = row['Runtime (min)']
        const data = {
          titleId:       row['Title ID'],
          season:        row['Season'],
          episodeNumber: row['Episode Number'],
          episodeTitle:  row['Episode Title'] != null ? String(row['Episode Title']) : null,
          description:   row['Episode Description'],
          releaseDate:   excelDate(row['Episode Release Date']),
          runtime:       (rawRuntime != null && !isNaN(Number(rawRuntime))) ? Number(rawRuntime) : null,
          episodeScore:  row['Episode Score'] ? Number(row['Episode Score']) : null,
        }
        const exists = await prisma.episode.findUnique({ where: { id }, select: { id: true } })
        if (exists) {
          await prisma.episode.update({ where: { id }, data })
        } else {
          await prisma.episode.create({ data: { id, ...data } })
        }
      } catch (err) {
        errors.push({ entity: 'episode', id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // ── Castings ─────────────────────────────────────────────────────────────

    for (const row of castingRows) {
      const rowId = row['Casting ID']
      try {
        const match = await prisma.casting.findFirst({
          where: {
            personId:    row['Person ID'],
            characterId: row['Character ID'],
            titleId:     row['Title ID'],
            episodeId:   row['Episode ID'] ?? null,
          },
          select: { id: true },
        })
        if (match) {
          await prisma.casting.update({ where: { id: match.id }, data: { notes: row['Notes'] } })
        } else {
          await prisma.casting.create({
            data: {
              personId:    row['Person ID'],
              characterId: row['Character ID'],
              titleId:     row['Title ID'],
              episodeId:   row['Episode ID'] ?? null,
              notes:       row['Notes'],
            },
          })
        }
      } catch (err) {
        errors.push({ entity: 'casting', id: rowId, error: err instanceof Error ? err.message : String(err) })
      }
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
      errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
