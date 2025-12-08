/*
  Warnings:

  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_categories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryName` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryName" AS ENUM ('TOP', 'BOTTOM', 'DRESS', 'OUTER', 'SKIRT', 'SHOES', 'ACC');

-- DropForeignKey
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_productId_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "categoryName" "CategoryName" NOT NULL;

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "product_categories";
