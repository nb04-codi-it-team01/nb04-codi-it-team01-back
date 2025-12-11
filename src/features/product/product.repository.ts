import prisma from '../../lib/prisma';
import type { CategoryName, Prisma } from '@prisma/client';
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

  delete(productId: string) {
    return prisma.product.delete({
      where: { id: productId },
    });
  }

  async createInquiry(
    userId: string,
    productId: string,
    params: {
      title: string;
      content: string;
      isSecret: boolean;
    },
  ) {
    return prisma.inquiry.create({
      data: {
        userId,
        productId,
        title: params.title,
        content: params.content,
        isSecret: params.isSecret,
      },
    });
  }

  async findInquiriesByProductId(
    productId: string,
    userId?: string,
    isStoreOwner: boolean = false,
  ) {
    const where: Prisma.InquiryWhereInput = { productId };

    if (!isStoreOwner) {
      where.AND = [
        {
          OR: [
            { isSecret: false }, // 1. 공개글
            { userId: userId }, // 2. 내가 쓴 비밀글
          ],
        },
      ];
    }
    // (판매자라면 위 필터링 없이 모든 글 조회됨)

    return prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } }, // 작성자 정보
        reply: {
          include: { user: { select: { name: true } } }, // 답변자 정보
        },
      },
    });
  }

  // --- 트랜잭션 안에서만 쓰는 쿼리들 ---

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
      categoryName: CategoryName;
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
      categoryName,
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
        categoryName,
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
