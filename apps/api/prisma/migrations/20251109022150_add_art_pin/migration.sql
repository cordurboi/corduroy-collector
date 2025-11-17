/*
  Warnings:

  - A unique constraint covering the columns `[pin]` on the table `Art` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Art" ADD COLUMN     "pin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Art_pin_key" ON "Art"("pin");
