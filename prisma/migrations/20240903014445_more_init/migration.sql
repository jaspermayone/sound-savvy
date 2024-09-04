/*
  Warnings:

  - A unique constraint covering the columns `[callId]` on the table `Memo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `Memo` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `phoneNumber` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Memo" DROP CONSTRAINT "Memo_userId_fkey";

-- AlterTable
ALTER TABLE "Memo" ADD COLUMN     "callId" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "CallerCountry" TEXT NOT NULL,
    "CallSid" TEXT NOT NULL,
    "StirVerstat" TEXT NOT NULL,
    "ApiVersion" TEXT NOT NULL,
    "AccountSid" TEXT NOT NULL,
    "Caller" TEXT NOT NULL,
    "FromCity" TEXT NOT NULL,
    "FromZip" TEXT NOT NULL,
    "FromState" TEXT NOT NULL,
    "FromCountry" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoId" TEXT,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Call_memoId_key" ON "Call"("memoId");

-- CreateIndex
CREATE UNIQUE INDEX "Memo_callId_key" ON "Memo"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
