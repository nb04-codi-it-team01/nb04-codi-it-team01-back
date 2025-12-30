-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_storeId_fkey";

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "storeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
