import prisma from '../../lib/prisma';
import { CreateStoreDto, UpdateStoreDto } from './store.dto';

export class StoreRepository {
  async findByUserId(userId: string) {
    return prisma.store.findUnique({ where: { userId } });
  }

  async findByStoreId(storeId: string) {
    return prisma.store.findUnique({ where: { id: storeId } });
  }

  async create(userId: string, data: CreateStoreDto) {
    return prisma.store.create({ data: { userId, ...data } });
  }

  async update(storeId: string, data: UpdateStoreDto) {
    return prisma.store.update({
      where: { id: storeId },
      data,
    });
  }

  async getFavoriteCount(storeId: string): Promise<number> {
    return prisma.userLike.count({
      where: { storeId },
    });
  }

  async getProductCount(storeId: string): Promise<number> {
    return prisma.product.count({
      where: { storeId },
    });
  }

  async getTotalSoldCount(storeId: string): Promise<number> {
    const result = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        product: {
          storeId,
        },
      },
    });

    return result._sum.quantity ?? 0;
  }

  async getMonthFavoriteCount(storeId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prisma.userLike.count({
      where: {
        storeId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });
  }

  async findProductsByStore(storeId: string, page: number, pageSize: number) {
    const totalCount = await prisma.product.count({
      where: { storeId },
    });

    const products = await prisma.product.findMany({
      where: { storeId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { stocks: true },
    });

    return { totalCount, products };
  }

  async upsertLike(userId: string, storeId: string) {
    return prisma.userLike.upsert({
      where: { userId_storeId: { userId, storeId } },
      create: { userId, storeId },
      update: {},
    });
  }

  async deleteLike(userId: string, storeId: string) {
    return prisma.userLike.delete({
      where: { userId_storeId: { userId, storeId } },
    });
  }
}
