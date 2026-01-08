-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN "storeId" TEXT;

-- CreateIndex
CREATE INDEX "inquiries_storeId_idx" ON "inquiries"("storeId");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
