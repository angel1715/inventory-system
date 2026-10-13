-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "debtBefore" DECIMAL(65,30) NOT NULL,
    "debtAfter" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "cashSessionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "ncf" TEXT,
    "amountApplied" DECIMAL(65,30) NOT NULL,
    "pendingAfter" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "PaymentReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReceipt_businessId_createdAt_idx" ON "PaymentReceipt"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReceipt_customerId_idx" ON "PaymentReceipt"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_businessId_receiptNumber_key" ON "PaymentReceipt"("businessId", "receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentReceiptLine_receiptId_idx" ON "PaymentReceiptLine"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_barcode_key" ON "Product"("businessId", "barcode");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptLine" ADD CONSTRAINT "PaymentReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
