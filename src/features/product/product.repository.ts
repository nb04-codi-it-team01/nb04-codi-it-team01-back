import prisma from '../../lib/prisma';
import type { CategoryName, Prisma } from '@prisma/client';
import { ProductWithDetailRelations } from './product.type';

export class ProductRepository {
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
    storeId: string,
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
        storeId,
        title: params.title,
        content: params.content,
        isSecret: params.isSecret,
      },
    });
  }

  async findInquiriesByProductId(
    productId: string,
    userId: string | undefined, // 로그인 안 한 유저일 수도 있음
    isStoreOwner: boolean,
    page: number,
    pageSize: number,
  ) {
    const skip = (page - 1) * pageSize;

    // 조회 조건 설정
    const where: Prisma.InquiryWhereInput = {
      productId,
      ...(isStoreOwner
        ? {} // 판매자면 비밀글 포함 모든 글 조회
        : {
            OR: [
              { isSecret: false }, // 공개글
              ...(userId ? [{ userId }] : []), // 내 비밀글
            ],
          }),
    };

    // 데이터(list)와 전체 개수(count)를 동시에 조회
    const [list, totalCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          user: true, // 작성자 정보
          reply: {
            include: { user: true }, // 답변자(판매자) 정보
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { list, totalCount };
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
