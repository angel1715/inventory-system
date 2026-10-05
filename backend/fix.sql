-- DropIndex
DROP INDEX "Product_barcode_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "CashMovement" DROP COLUMN "type",
ADD COLUMN     "type" "CashMovementType" NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "costPriceSnapshot" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");

-- CreateIndex
CREATE INDEX "CashSession_businessId_status_idx" ON "CashSession"("businessId", "status");

-- CreateIndex
CREATE INDEX "CreditMovement_saleId_idx" ON "CreditMovement"("saleId");

-- CreateIndex
CREATE INDEX "CreditMovement_cashSessionId_idx" ON "CreditMovement"("cashSessionId");

-- CreateIndex
CREATE INDEX "CreditMovement_type_createdAt_idx" ON "CreditMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_businessId_idx" ON "Customer"("businessId");

-- CreateIndex
CREATE INDEX "InventoryMovement_businessId_createdAt_idx" ON "InventoryMovement"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemSerial_productId_idx" ON "ItemSerial"("productId");

-- CreateIndex
CREATE INDEX "ItemSerial_saleItemId_idx" ON "ItemSerial"("saleItemId");

-- CreateIndex
CREATE INDEX "ManualPaymentLog_businessId_idx" ON "ManualPaymentLog"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_barcode_key" ON "Product"("businessId", "barcode");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "Sale_businessId_createdAt_idx" ON "Sale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_cashSessionId_idx" ON "Sale"("cashSessionId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_invoiceNumber_key" ON "Sale"("businessId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- AddForeignKey
ALTER TABLE "ItemSerial" ADD CONSTRAINT "ItemSerial_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditMovement" ADD CONSTRAINT "CreditMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

