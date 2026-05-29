-- Convert TitleType, PersonType, and CharacterType from Postgres enums to TEXT
-- so new values can be added by data import without a schema change. Existing
-- enum values are preserved verbatim via the ::TEXT cast.

-- Title.titleType
ALTER TABLE "titles" ALTER COLUMN "titleType" DROP DEFAULT;
ALTER TABLE "titles" ALTER COLUMN "titleType" TYPE TEXT USING "titleType"::TEXT;
ALTER TABLE "titles" ALTER COLUMN "titleType" SET DEFAULT 'film';

-- Person.personType
ALTER TABLE "persons" ALTER COLUMN "personType" DROP DEFAULT;
ALTER TABLE "persons" ALTER COLUMN "personType" TYPE TEXT USING "personType"::TEXT;
ALTER TABLE "persons" ALTER COLUMN "personType" SET DEFAULT 'actor';

-- Character.characterType
ALTER TABLE "characters" ALTER COLUMN "characterType" DROP DEFAULT;
ALTER TABLE "characters" ALTER COLUMN "characterType" TYPE TEXT USING "characterType"::TEXT;
ALTER TABLE "characters" ALTER COLUMN "characterType" SET DEFAULT 'supporting';

-- Drop the now-unused enum types
DROP TYPE "TitleType";
DROP TYPE "PersonType";
DROP TYPE "CharacterType";
