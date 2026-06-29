/*
  Warnings:

  - Added the required column `boardId` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_shapeId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "boardId" TEXT NOT NULL;
