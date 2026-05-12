/*
  Warnings:

  - A unique constraint covering the columns `[boardId,version]` on the table `Snapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "currentSnapshotVersion" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_boardId_version_key" ON "Snapshot"("boardId", "version");
