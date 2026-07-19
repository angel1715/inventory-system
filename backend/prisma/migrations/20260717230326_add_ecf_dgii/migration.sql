-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "ecfApiKey" TEXT,
ADD COLUMN     "ecfBaseUrl" TEXT,
ADD COLUMN     "ecfEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ecfTaxId" INTEGER;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "ecfInvoiceId" INTEGER,
ADD COLUMN     "ecfMessage" TEXT,
ADD COLUMN     "ecfQrLink" TEXT,
ADD COLUMN     "ecfStatus" TEXT;

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "ncf" TEXT NOT NULL,
    "ncfType" TEXT NOT NULL,
    "ncfSequenceId" TEXT,
    "modificationCode" TEXT NOT NULL,
    "baseAmount" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "ecfStatus" TEXT,
    "ecfInvoiceId" INTEGER,
    "ecfQrLink" TEXT,
    "ecfMessage" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditNote_businessId_idx" ON "CreditNote"("businessId");

-- CreateIndex
CREATE INDEX "CreditNote_saleId_idx" ON "CreditNote"("saleId");

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_ncfSequenceId_fkey" FOREIGN KEY ("ncfSequenceId") REFERENCES "NcfSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

