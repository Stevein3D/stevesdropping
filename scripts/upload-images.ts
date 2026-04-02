/**
 * Batch upload all images from the local /images folder to ImageKit,
 * then update the imageUrl field in the database for each matched record.
 *
 * Usage: npm run images:upload
 */

import * as fs from 'fs'
import * as path from 'path'
import ImageKit from 'imagekit'
import { PrismaClient } from '@prisma/client'

// Load env vars
import { config } from 'dotenv'
config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

const imagekit = new ImageKit({
  publicKey:   process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey:  process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
})

const IMAGES_DIR = path.resolve(__dirname, '../images')

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(
  filePath: string,
  fileName: string,
  folder: string,
): Promise<string> {
  const file = fs.readFileSync(filePath)
  const result = await imagekit.upload({
    file,
    fileName,
    folder,
    useUniqueFileName: false,
  })
  return result.url
}

// ─── People ──────────────────────────────────────────────────────────────────

async function uploadPeople() {
  const dir = path.join(IMAGES_DIR, 'people')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))
  let ok = 0, skip = 0

  for (const file of files) {
    const base = path.basename(file, '.jpg')
    const asId = parseInt(base)
    const person = !isNaN(asId)
      ? await prisma.person.findUnique({ where: { id: asId } })
      : await prisma.person.findFirst({ where: { name: base } })

    if (!person) {
      console.log(`  ⚠ No DB record for person: "${base}"`)
      skip++
      continue
    }

    const url = await uploadFile(path.join(dir, file), `${person.id}.jpg`, '/stevesdropping/people')
    await prisma.person.update({ where: { id: person.id }, data: { imageUrl: url } })
    console.log(`  ✓ ${base} → ${url}`)
    ok++
  }

  console.log(`People: ${ok} uploaded, ${skip} skipped\n`)
}

// ─── Characters ──────────────────────────────────────────────────────────────

async function uploadCharacters() {
  const dir = path.join(IMAGES_DIR, 'character')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))
  let ok = 0, skip = 0

  for (const file of files) {
    const name = path.basename(file, '.jpg')
    const character = await prisma.character.findFirst({ where: { name } })

    if (!character) {
      console.log(`  ⚠ No DB record for character: "${name}"`)
      skip++
      continue
    }

    const url = await uploadFile(path.join(dir, file), `${character.id}.jpg`, '/stevesdropping/characters')
    await prisma.character.update({ where: { id: character.id }, data: { imageUrl: url } })
    console.log(`  ✓ ${name} → ${url}`)
    ok++
  }

  console.log(`Characters: ${ok} uploaded, ${skip} skipped\n`)
}

// ─── Titles ───────────────────────────────────────────────────────────────────

async function uploadTitles() {
  const dir = path.join(IMAGES_DIR, 'title')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))
  let ok = 0, skip = 0

  for (const file of files) {
    const id = parseInt(path.basename(file, '.jpg'))

    if (isNaN(id)) {
      console.log(`  ⚠ Skipping non-ID filename: "${file}"`)
      skip++
      continue
    }

    const title = await prisma.title.findUnique({ where: { id } })

    if (!title) {
      console.log(`  ⚠ No DB record for title ID: ${id}`)
      skip++
      continue
    }

    const url = await uploadFile(path.join(dir, file), `${id}.jpg`, '/stevesdropping/titles')
    await prisma.title.update({ where: { id }, data: { imageUrl: url } })
    console.log(`  ✓ ${title.name} (${title.year}) → ${url}`)
    ok++
  }

  console.log(`Titles: ${ok} uploaded, ${skip} skipped\n`)
}

// ─── Castings ─────────────────────────────────────────────────────────────────

async function uploadCastings() {
  const dir = path.join(IMAGES_DIR, 'casting')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'))
  let ok = 0, skip = 0

  for (const file of files) {
    const id = parseInt(path.basename(file, '.jpg'))

    if (isNaN(id)) {
      console.log(`  ⚠ Skipping non-ID filename: "${file}"`)
      skip++
      continue
    }

    const casting = await prisma.casting.findUnique({
      where: { id },
      include: { person: true, character: true },
    })

    if (!casting) {
      console.log(`  ⚠ No DB record for casting ID: ${id}`)
      skip++
      continue
    }

    const url = await uploadFile(path.join(dir, file), `${id}.jpg`, '/stevesdropping/casting')
    await prisma.casting.update({ where: { id }, data: { imageUrl: url } })
    console.log(`  ✓ ${casting.person.name} as ${casting.character.name} → ${url}`)
    ok++
  }

  console.log(`Castings: ${ok} uploaded, ${skip} skipped\n`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🖼  Starting image upload to ImageKit…\n')

  console.log('── People ──')
  await uploadPeople()

  console.log('── Characters ──')
  await uploadCharacters()

  console.log('── Titles ──')
  await uploadTitles()

  console.log('── Castings ──')
  await uploadCastings()

  console.log('✅ Done')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
