import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Look at the 5 mismatched episodes
  const eps = await prisma.episode.findMany({
    where: { id: { in: [43582, 43583, 43584, 43585, 43586] } },
    include: { title: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' },
  })
  console.log('\n=== Episodes 43582-43586 (where Parenthood + Steve Harvey collide) ===')
  for (const e of eps) {
    console.log({
      id: e.id,
      titleId: e.titleId,
      titleName: e.title.name,
      season: e.season,
      episodeNumber: e.episodeNumber,
      episodeTitle: e.episodeTitle,
      releaseDate: e.releaseDate?.toISOString().slice(0,10),
    })
  }

  // Also check how many episodes Parenthood has total
  const parenthoodEpCount = await prisma.episode.count({ where: { titleId: 21608 } })
  const harveyEpCount     = await prisma.episode.count({ where: { titleId: 21031 } })
  console.log(`\nParenthood (21608) episodes: ${parenthoodEpCount}`)
  console.log(`The Steve Harvey Show (21031) episodes: ${harveyEpCount}`)

  // For each mismatched episode, show ALL its castings to see if other people are also there
  for (const epId of [43582, 43583, 43584, 43585, 43586]) {
    const castings = await prisma.casting.findMany({
      where: { episodeId: epId },
      include: {
        person:    { select: { id: true, name: true } },
        character: { select: { id: true, name: true } },
        title:     { select: { id: true, name: true } },
      },
    })
    console.log(`\n--- Episode ${epId} castings (${castings.length}) ---`)
    for (const c of castings) {
      console.log(`  casting ${c.id}: person=${c.person.name}(${c.personId}) char=${c.character.name}(${c.characterId}) castingTitle=${c.title.name}(${c.titleId})`)
    }
  }

  // Run the global mismatch count - how widespread is this?
  const totalMismatches = await prisma.$queryRaw<{count: bigint}[]>`
    SELECT COUNT(*)::bigint AS count
    FROM castings c
    JOIN episodes e ON e.id = c."episodeId"
    WHERE c."episodeId" IS NOT NULL
      AND c."titleId" != e."titleId"
  `
  console.log(`\n=== TOTAL casting/episode titleId mismatches across DB: ${totalMismatches[0].count} ===`)

  // Count distinct titles whose episodes are polluted by foreign castings
  const pollutedTitles = await prisma.$queryRaw<{episode_title_id: number, episode_title_name: string, mismatch_count: bigint}[]>`
    SELECT e."titleId" AS episode_title_id, t.name AS episode_title_name, COUNT(*)::bigint AS mismatch_count
    FROM castings c
    JOIN episodes e ON e.id = c."episodeId"
    JOIN titles t ON t.id = e."titleId"
    WHERE c."episodeId" IS NOT NULL AND c."titleId" != e."titleId"
    GROUP BY e."titleId", t.name
    ORDER BY mismatch_count DESC
    LIMIT 15
  `
  console.log('\n=== Titles whose episode pages would show foreign castings ===')
  console.table(pollutedTitles.map(r => ({ ...r, mismatch_count: Number(r.mismatch_count) })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
