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
}

export const storeRepository = new StoreRepository();
