/*
  Warnings:

  - The values [PURCHASE] on the enum `MovementType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MovementType_new" AS ENUM ('SALE', 'RESTOCK', 'ADJUSTMENT');
ALTER TABLE "InventoryMovement" ALTER COLUMN "type" TYPE "MovementType_new" USING ("type"::text::"MovementType_new");
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";
DROP TYPE "public"."MovementType_old";
COMMIT;

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "idempotencyKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_idempotencyKey_key" ON "Sale"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
