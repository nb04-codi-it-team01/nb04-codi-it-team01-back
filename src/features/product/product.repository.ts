import prisma from '../../lib/prisma';
import type { Prisma } from '@prisma/client';
import { ProductWithDetailRelations } from './product.type';

export class ProductRepository {
  // --- 트랜잭션 바깥에서 쓰는 쿼리들 ---

  async findStoreByUserId(userId: string) {
    return prisma.store.findFirst({
      where: { userId },
    });
  }

  async findProductDetail(productId: string): Promise<ProductWithDetailRelations | null> {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
        categories: {
          include: { category: true },
        },
        stocks: {
          include: { size: true },
        },
        reviews: true,
        inquiries: {
          include: {
            reply: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async findProductWithStore(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
      },
    });
  }

  // --- 트랜잭션 안에서만 쓰는 쿼리들 ---

  async upsertCategoryByName(tx: Prisma.TransactionClient, categoryName: string) {
    return tx.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }

  async createProduct(
    tx: Prisma.TransactionClient,
    params: {
      storeId: string;
      name: string;
      price: number;
      content?: string;
      image?: string;
      discountRate?: number;
      discountStartTime?: string;
      discountEndTime?: string;
      categoryId: string;
    },
  ) {
    const {
      storeId,
      name,
      price,
      content,
      image,
      discountRate,
      discountStartTime,
      discountEndTime,
      categoryId,
    } = params;

    return tx.product.create({
      data: {
        name,
        price,
        content,
        image,
        discountRate,
        discountStartTime: discountStartTime ? new Date(discountStartTime) : undefined,
        discountEndTime: discountEndTime ? new Date(discountEndTime) : undefined,
        storeId,
        categories: {
          create: [
            {
              categoryId,
            },
          ],
        },
      },
    });
  }

  async createStocks(
    tx: Prisma.TransactionClient,
    productId: string,
    stocks: { sizeId: number; quantity: number }[],
  ) {
    if (!stocks.length) return;

    await tx.stock.createMany({
      data: stocks.map((s) => ({
        productId,
        sizeId: s.sizeId,
        quantity: s.quantity,
      })),
    });
  }

  async updateProduct(
    tx: Prisma.TransactionClient,
    productId: string,
    data: Prisma.ProductUpdateInput,
  ) {
    return tx.product.update({
      where: { id: productId },
      data,
    });
  }

  async deleteStocksByProductId(tx: Prisma.TransactionClient, productId: string) {
    await tx.stock.deleteMany({
      where: { productId },
    });
  }
}
