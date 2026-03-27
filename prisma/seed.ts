import { PrismaClient, PersonType, CharacterType, TitleType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Stevesdropping database...')

  // ─── Clean slate ────────────────────────────────────────────────────────────
  await prisma.casting.deleteMany()
  await prisma.episode.deleteMany()
  await prisma.title.deleteMany()
  await prisma.character.deleteMany()
  await prisma.person.deleteMany()

  // ─── People ─────────────────────────────────────────────────────────────────
  const people = await prisma.$transaction([
    prisma.person.create({ data: { id: 10001, name: 'Chris Evans',      personType: 'actor',     birthYear: 1981,                nationality: 'American',            bio: 'Actor, producer, and director' } }),
    prisma.person.create({ data: { id: 10002, name: 'Chris Pine',       personType: 'actor',     birthYear: 1980,                nationality: 'American',            bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10003, name: 'George Newbern',   personType: 'actor',     birthYear: 1964,                nationality: 'American',            bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10004, name: 'Jeffrey Donovan',  personType: 'actor',     birthYear: 1968,                nationality: 'American',            bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10005, name: 'Kaz Garas',        personType: 'actor',     birthYear: 1940,                nationality: 'Lithuanian-American', bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10006, name: 'Lyle Waggoner',    personType: 'actor',     birthYear: 1935,                nationality: null,                  bio: 'Actor, sculptor, presenter, model' } }),
    prisma.person.create({ data: { id: 10007, name: 'Matt Salinger',    personType: 'actor',     birthYear: 1960,                nationality: 'American',            bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10008, name: 'Patrick Duffy',    personType: 'actor',     birthYear: 1949,                nationality: 'American',            bio: 'Actor, director, and producer' } }),
    prisma.person.create({ data: { id: 10009, name: 'Reb Brown',        personType: 'actor',     birthYear: 1948,                nationality: null,                  bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10010, name: 'Tahmoh Penikett',  personType: 'actor',     birthYear: 1975,                nationality: 'Canadian',            bio: 'Actor' } }),
    prisma.person.create({ data: { id: 10011, name: 'Steve Burns',      personType: 'actor',     birthYear: 1973,                nationality: 'American',            bio: 'Actor, musician and television host' } }),
    prisma.person.create({ data: { id: 10012, name: 'Steve Ditko',      personType: 'celebrity', birthYear: 1927, deathYear: 2018, nationality: 'American',           bio: 'Comic book artist' } }),
    prisma.person.create({ data: { id: 10013, name: 'Steve Guttenberg', personType: 'actor',     birthYear: 1958,                nationality: 'American',            bio: 'Actor, author, businessman, producer, and director' } }),
    prisma.person.create({ data: { id: 10014, name: 'Steve Jobs',       personType: 'celebrity', birthYear: 1955, deathYear: 2011, nationality: 'American',           bio: 'Businessman, inventor, and investor' } }),
    prisma.person.create({ data: { id: 10015, name: 'Dean Fredericks',  personType: 'actor',     birthYear: 1924, deathYear: 1999, nationality: 'American',           bio: 'Actor' } }),
  ])
  console.log(`✅ Seeded ${people.length} people`)

  // ─── Characters ─────────────────────────────────────────────────────────────
  const characters = await prisma.$transaction([
    prisma.character.create({ data: { id: 30001, name: 'Steve Rogers',  characterType: 'protagonist', description: 'Superhero known as Captain America' } }),
    prisma.character.create({ data: { id: 30002, name: 'Steve Trevor',  characterType: 'supporting',  description: 'U.S. Army Air Force pilot, love interest of Wonder Woman' } }),
    prisma.character.create({ data: { id: 30003, name: 'Steve Canyon',  characterType: 'protagonist', description: 'Courageous, easy-going, and patriotic American airman who was a civilian operator and United States Air Force officer' } }),
    prisma.character.create({ data: { id: 30004, name: 'Steve Zodiac',  characterType: 'protagonist', description: 'Heroic commander of the spaceship Fireball XL5' } }),
    prisma.character.create({ data: { id: 30005, name: 'Steve Austin',  characterType: 'protagonist', description: 'Test pilot, injured in an accident, rebuilt with bionics as part man, part machine.' } }),
    prisma.character.create({ data: { id: 30006, name: 'Steve Zissou',  characterType: 'protagonist', description: 'Eccentric oceanographer seeking to exact revenge on the "jaguar shark"' } }),
  ])
  console.log(`✅ Seeded ${characters.length} characters`)

  // ─── Titles ─────────────────────────────────────────────────────────────────
  const titles = await prisma.$transaction([
    prisma.title.create({ data: { id: 20001, name: 'Captain America: Civil War',                     year: 2016, titleType: 'film',      genre: 'Action', runtime: 147, description: "Political involvement in the Avengers' affairs causes a rift between Captain America and Iron Man." } }),
    prisma.title.create({ data: { id: 20002, name: 'Captain America: The First Avenger',             year: 2011, titleType: 'film',      genre: 'Action', runtime: 124, description: 'Steve Rogers transforms into Captain America after taking a Super-Soldier serum' } }),
    prisma.title.create({ data: { id: 20003, name: 'Captain America: The Winter Soldier',            year: 2014, titleType: 'film',      genre: 'Action', runtime: 136, description: 'Steve Rogers battles a new threat from history: an assassin known as the Winter Soldier' } }),
    prisma.title.create({ data: { id: 20004, name: 'Wonder Woman',                                   year: 2017, titleType: 'film',      genre: 'Action', runtime: 141, description: 'Diana, an Amazonian warrior, leaves home to fight an international conflict' } }),
    prisma.title.create({ data: { id: 20005, name: 'Wonder Woman 1984',                              year: 2020, titleType: 'film',      genre: 'Action', runtime: 151, description: 'Wonder Woman battles two opponents in the 1980s' } }),
    prisma.title.create({ data: { id: 20006, name: 'Wonder Woman: Bloodlines',                       year: 2019, titleType: 'animated',  genre: 'Action', runtime: 83,  description: 'Wonder Woman helps a troubled young girl involved with a deadly organization' } }),
    prisma.title.create({ data: { id: 20007, name: 'Captain America',                                year: 1979, titleType: 'tv_movie',  genre: 'Action', runtime: 97,  description: 'A recipient of experimental body enhancement fights as a superhero' } }),
    prisma.title.create({ data: { id: 20008, name: 'Captain America',                                year: 1990, titleType: 'tv_movie',  genre: 'Action', runtime: 97,  description: 'Frozen in ice, Captain America is freed to battle The Red Skull' } }),
    prisma.title.create({ data: { id: 20009, name: 'Captain America II: Death Too Soon',             year: 1979, titleType: 'tv_movie',  genre: 'Action', runtime: 88,  description: "Captain America battles a villain's plan to poison America" } }),
    prisma.title.create({ data: { id: 20010, name: 'The New Original Wonder Woman',                  year: 1975, titleType: 'tv_movie',  genre: 'Action', runtime: 74,  description: 'The first Wonder Woman TV movie pilot' } }),
    prisma.title.create({ data: { id: 20011, name: 'Wonder Woman',                                   year: 1974, titleType: 'tv_movie',  genre: 'Action', runtime: 73,  description: 'A super-hero uses her powers to thwart an international spy ring' } }),
    prisma.title.create({ data: { id: 20012, name: 'Justice League',                                 year: 2001, titleType: 'tv_series', genre: 'Action', runtime: 22,  description: 'Seven of the most formidable heroes form the most powerful team ever' } }),
    prisma.title.create({ data: { id: 20016, name: 'Justice League: Gods and Monsters Chronicles',  year: 2015, titleType: 'tv_series', genre: 'Action', runtime: 6,   description: "In an alternate universe, different versions of DC's Trinity operate outside of the law" } }),
    prisma.title.create({ data: { id: 20018, name: 'Justice League: War',                            year: 2014, titleType: 'animated',  genre: 'Action', runtime: 79,  description: "The world's finest heroes found the Justice League to stop an alien invasion" } }),
    prisma.title.create({ data: { id: 20019, name: 'Wonder Woman',                                   year: 1976, titleType: 'tv_series', genre: 'Action', runtime: 60,  description: 'The classic TV series featuring Wonder Woman and Steve Trevor' } }),
    prisma.title.create({ data: { id: 20020, name: 'Steve Canyon',                                   year: 1958, titleType: 'tv_series', genre: 'Action', runtime: 30,  description: 'TV series based on the Milton Caniff comic strip, following Air Force officer Steve Canyon' } }),
  ])
  console.log(`✅ Seeded ${titles.length} titles`)

  // ─── Episodes ───────────────────────────────────────────────────────────────
  const episodes = await prisma.$transaction([
    prisma.episode.create({ data: { id: 1001, titleId: 20012, season: 1, episodeNumber: 24, episodeTitle: 'The Savage Time',             runtime: 22, description: 'The Justice League go back in time to World War II to prevent Vandal Savage from using future technology' } }),
    prisma.episode.create({ data: { id: 1002, titleId: 20012, season: 1, episodeNumber: 25, episodeTitle: 'The Savage Time Part II',     runtime: 23, description: 'Mired in World War II, the Leaguers discover Vandal Savage has usurped Hitler' } }),
    prisma.episode.create({ data: { id: 1003, titleId: 20012, season: 1, episodeNumber: 26, episodeTitle: 'The Savage Time Part III',    runtime: 23, description: "With Sgt. Rock, the League races to stop Savage's plans to invade the U.S." } }),
    prisma.episode.create({ data: { id: 1004, titleId: 20016, season: 1, episodeNumber: 3,  episodeTitle: 'Big',                         runtime: 6,  description: 'Wonder Woman must take on Kobra soldiers to save her friend Steve Trevor' } }),
    prisma.episode.create({ data: { id: 1005, titleId: 20019, season: 1, episodeNumber: 1,  episodeTitle: 'The New Original Wonder Woman', runtime: 60, description: 'Pilot episode: Steve Trevor crashes on Paradise Island and meets Diana' } }),
  ])
  console.log(`✅ Seeded ${episodes.length} episodes`)

  // ─── Castings ───────────────────────────────────────────────────────────────
  const castings = await prisma.$transaction([
    // Chris Evans as Steve Rogers
    prisma.casting.create({ data: { id: 5001, personId: 10001, characterId: 30001, titleId: 20001, episodeId: null } }),
    prisma.casting.create({ data: { id: 5002, personId: 10001, characterId: 30001, titleId: 20002, episodeId: null } }),
    prisma.casting.create({ data: { id: 5003, personId: 10001, characterId: 30001, titleId: 20003, episodeId: null } }),
    // Chris Pine as Steve Trevor
    prisma.casting.create({ data: { id: 5004, personId: 10002, characterId: 30002, titleId: 20004, episodeId: null } }),
    prisma.casting.create({ data: { id: 5005, personId: 10002, characterId: 30002, titleId: 20005, episodeId: null } }),
    // George Newbern as Steve Trevor (Justice League: War)
    prisma.casting.create({ data: { id: 5006, personId: 10003, characterId: 30002, titleId: 20018, episodeId: null } }),
    // Jeffrey Donovan as Steve Trevor (Wonder Woman: Bloodlines)
    prisma.casting.create({ data: { id: 5007, personId: 10004, characterId: 30002, titleId: 20006, episodeId: null } }),
    // Kaz Garas as Steve Trevor (Wonder Woman 1974)
    prisma.casting.create({ data: { id: 5008, personId: 10005, characterId: 30002, titleId: 20011, episodeId: null } }),
    // Lyle Waggoner as Steve Trevor
    prisma.casting.create({ data: { id: 5009, personId: 10006, characterId: 30002, titleId: 20010, episodeId: null } }),
    prisma.casting.create({ data: { id: 5010, personId: 10006, characterId: 30002, titleId: 20019, episodeId: null } }),
    // Matt Salinger as Steve Rogers (Captain America 1990)
    prisma.casting.create({ data: { id: 5011, personId: 10007, characterId: 30001, titleId: 20008, episodeId: null } }),
    // Patrick Duffy as Steve Trevor (Justice League episodes)
    prisma.casting.create({ data: { id: 5012, personId: 10008, characterId: 30002, titleId: 20012, episodeId: 1001 } }),
    prisma.casting.create({ data: { id: 5013, personId: 10008, characterId: 30002, titleId: 20012, episodeId: 1002 } }),
    prisma.casting.create({ data: { id: 5014, personId: 10008, characterId: 30002, titleId: 20012, episodeId: 1003 } }),
    // Reb Brown as Steve Rogers (Captain America 1979)
    prisma.casting.create({ data: { id: 5015, personId: 10009, characterId: 30001, titleId: 20007, episodeId: null } }),
    prisma.casting.create({ data: { id: 5016, personId: 10009, characterId: 30001, titleId: 20009, episodeId: null } }),
    // Tahmoh Penikett as Steve Trevor (Gods and Monsters Chronicles)
    prisma.casting.create({ data: { id: 5017, personId: 10010, characterId: 30002, titleId: 20016, episodeId: 1004 } }),
    // Dean Fredericks as Steve Canyon
    prisma.casting.create({ data: { id: 5018, personId: 10015, characterId: 30003, titleId: 20020, episodeId: null } }),
  ])
  console.log(`✅ Seeded ${castings.length} castings`)

  console.log('\n🎉 Seed complete!')
  console.log('   People without castings: Steve Burns, Steve Ditko, Steve Guttenberg, Steve Jobs')
  console.log('   Characters without castings: Steve Zodiac, Steve Austin, Steve Zissou')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
