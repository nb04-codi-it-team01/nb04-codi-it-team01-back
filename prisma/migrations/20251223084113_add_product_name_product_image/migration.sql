/*
  Warnings:

  - Added the required column `productName` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productName" TEXT NOT NULL;
