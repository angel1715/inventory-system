-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN     "trackingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_trackingToken_key" ON "ServiceOrder"("trackingToken");
