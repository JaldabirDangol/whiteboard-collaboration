-- Drop global unique constraint on title
DROP INDEX IF EXISTS "Board_title_key";
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_title_key";

-- Add creatorId column (nullable first to backfill, then make NOT NULL)
ALTER TABLE "Board" ADD COLUMN "creatorId" TEXT;
UPDATE "Board" SET "creatorId" = (SELECT "userId" FROM "BoardMember" WHERE "BoardMember"."boardId" = "Board"."id" AND "BoardMember"."role" = 'ADMIN' LIMIT 1);
ALTER TABLE "Board" ALTER COLUMN "creatorId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "Board" ADD CONSTRAINT "Board_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create per-user unique constraint on (title, creatorId)
CREATE UNIQUE INDEX "Board_title_creatorId_key" ON "Board"("title", "creatorId");
