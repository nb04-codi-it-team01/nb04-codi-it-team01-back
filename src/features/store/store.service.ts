import { CreateStoreDto, StoreResponseDto, UpdateStoreDto } from './store.dto';
import { storeRepository } from './store.repository';

class StoreService {
  async create(userId: string, data: CreateStoreDto): Promise<StoreResponseDto> {
    const existingStore = await storeRepository.findByUserId(userId);

    if (existingStore) {
      throw new Error('이미 해당 유저의 스토어가 존재합니다.');
    }

    const store = await storeRepository.create(userId, data);

    return {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async update(userId: string, data: UpdateStoreDto): Promise<StoreResponseDto> {
    const existingStore = await storeRepository.findByUserId(userId);
    if (!existingStore) throw new Error('스토어가 존재하지 않습니다.');

    const updatedStore = await storeRepository.update(userId, data);

    return {
      ...updatedStore,
      createdAt: updatedStore.createdAt.toISOString(),
      updatedAt: updatedStore.updatedAt.toISOString(),
    };
  }

  async getStoreDetail(storeId: string): Promise<StoreResponseDto> {
    const store = await storeRepository.getStoreDetail(storeId);

    if (!store) throw new Error('스토어가 존재하지 않습니다.');

    return {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }
}

export const storeService = new StoreService();
