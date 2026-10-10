-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ServiceStatus" ADD VALUE 'NOT_REPAIRABLE';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "origin" "SaleOrigin" NOT NULL DEFAULT 'POS';

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "costPriceSnapshot" SET DATA TYPE DECIMAL(65,30);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_invoiceNumber_key" ON "Sale"("businessId", "invoiceNumber");
