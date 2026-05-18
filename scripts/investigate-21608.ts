import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. What is title 21608?
  const title = await prisma.title.findUnique({
    where: { id: 21608 },
    select: { id: true, name: true, titleType: true, year: true, endDate: true },
  })
  console.log('\n=== Title 21608 ===')
  console.log(title)

  // 2. What is character 31610?
  const character = await prisma.character.findUnique({
    where: { id: 31610 },
    select: { id: true, name: true, characterType: true, description: true },
  })
  console.log('\n=== Character 31610 ===')
  console.log(character)

  // 3. Find Steve Harvey
  const steveHarveys = await prisma.person.findMany({
    where: { name: { contains: 'Steve Harvey', mode: 'insensitive' } },
    select: { id: true, name: true, personType: true },
  })
  console.log('\n=== Persons named Steve Harvey ===')
  console.log(steveHarveys)

  // 4. All castings for title 21608 where person is Steve Harvey
  const sHarveyIds = steveHarveys.map(s => s.id)
  const castings = await prisma.casting.findMany({
    where: {
      titleId: 21608,
      personId: { in: sHarveyIds },
    },
    include: {
      person: { select: { id: true, name: true } },
      character: { select: { id: true, name: true } },
      episode: { select: { id: true, season: true, episodeNumber: true, episodeTitle: true, titleId: true } },
    },
    orderBy: { id: 'asc' },
  })
  console.log(`\n=== Castings for title 21608 with Steve Harvey (${castings.length}) ===`)
  for (const c of castings) {
    console.log({
      castingId: c.id,
      personId: c.personId,
      personName: c.person.name,
      charId: c.characterId,
      charName: c.character.name,
      titleId: c.titleId,
      episodeId: c.episodeId,
      episode: c.episode,
    })
  }

  // 5. All castings where character 31610 is used (anywhere)
  const charCastings = await prisma.casting.findMany({
    where: { characterId: 31610 },
    include: {
      person: { select: { id: true, name: true } },
      title:   { select: { id: true, name: true } },
      episode: { select: { id: true, titleId: true, season: true, episodeNumber: true, episodeTitle: true } },
    },
    orderBy: { id: 'asc' },
  })
  console.log(`\n=== All castings using character 31610 (${charCastings.length}) ===`)
  for (const c of charCastings.slice(0, 30)) {
    console.log({
      castingId: c.id,
      person: `${c.person.id} ${c.person.name}`,
      title: `${c.title.id} ${c.title.name}`,
      episodeId: c.episodeId,
      episodeTitleId: c.episode?.titleId,
      ep: c.episode ? `s${c.episode.season}e${c.episode.episodeNumber}` : null,
    })
  }
  if (charCastings.length > 30) {
    console.log(`...and ${charCastings.length - 30} more`)
  }

  // 6. Check for mismatches: castings linked to title 21608 where episode's titleId differs
  const mismatches = await prisma.$queryRaw<{
    casting_id: number
    casting_title_id: number
    episode_id: number
    episode_title_id: number
    person_name: string
    character_id: number
    character_name: string
  }[]>`
    SELECT
      c.id           AS casting_id,
      c."titleId"    AS casting_title_id,
      c."episodeId"  AS episode_id,
      e."titleId"    AS episode_title_id,
      p.name         AS person_name,
      c."characterId" AS character_id,
      ch.name        AS character_name
    FROM castings c
    JOIN episodes e   ON e.id = c."episodeId"
    JOIN persons p    ON p.id = c."personId"
    JOIN characters ch ON ch.id = c."characterId"
    WHERE c."episodeId" IS NOT NULL
      AND (c."titleId" = 21608 OR e."titleId" = 21608)
      AND c."titleId" != e."titleId"
    ORDER BY c.id
  `
  console.log(`\n=== Cross-title casting/episode mismatches involving title 21608 (${mismatches.length}) ===`)
  for (const m of mismatches) {
    console.log(m)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
