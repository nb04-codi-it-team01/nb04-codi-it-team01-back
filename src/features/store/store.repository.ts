import prisma from '../../lib/prisma';
import { CreateStoreDto, UpdateStoreDto } from './store.dto';

class StoreRepository {
  async findByUserId(userId: string) {
    return prisma.store.findUnique({ where: { userId } });
  }

  async create(userId: string, data: CreateStoreDto) {
    return prisma.store.create({ data: { userId, ...data } });
  }

  async update(userId: string, data: UpdateStoreDto) {
    return prisma.store.update({
      where: { userId },
      data,
    });
  }

  async getStoreDetail(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: {
            favoriteUsers: true, // UserLike 관계 이름
          },
        },
      },
    });

    if (!store) {
      return null;
    }

    const { _count, ...rest } = store;

    return {
      ...rest,
      favoriteCount: _count.favoriteUsers,
    };
  }
}

export const storeRepository = new StoreRepository();
