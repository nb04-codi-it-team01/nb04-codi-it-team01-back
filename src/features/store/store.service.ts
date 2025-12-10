import { CreateStoreDto, StoreResponseDto, UpdateStoreDto } from './store.dto';
import { StoreRepository } from './store.repository';

export class StoreService {
  constructor(private readonly storeRepository = new StoreRepository()) {}

  async create(userId: string, userType: string, data: CreateStoreDto): Promise<StoreResponseDto> {
    const existingStore = await this.storeRepository.findByUserId(userId);

    if (userType !== 'SELLER') {
      throw new Error('판매자만 스토어를 생성할 수 있습니다.');
    }

    if (existingStore) {
      throw new Error('이미 해당 유저의 스토어가 존재합니다.');
    }

    const store = await this.storeRepository.create(userId, data);

    return {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async update(userId: string, storeId: string, data: UpdateStoreDto): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findByStoreId(storeId);
    if (!store) {
      throw new Error('스토어가 존재하지 않습니다.');
    }

    if (store.userId !== userId) {
      throw new Error('본인의 스토어만 수정할 수 있습니다.');
    }

    const updatedStore = await this.storeRepository.update(storeId, data);

    return {
      ...updatedStore,
      createdAt: updatedStore.createdAt.toISOString(),
      updatedAt: updatedStore.updatedAt.toISOString(),
    };
  }

  async getStoreDetail(storeId: string): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findByStoreId(storeId);

    if (!store) throw new Error('스토어가 존재하지 않습니다.');

    return {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  async getMyStoreDetail(userId: string) {
    const store = await this.storeRepository.findByUserId(userId);

    if (!store) throw new Error('스토어가 존재하지 않습니다.');

    const storeId = store.id;

    const myStoreDetail = await this.storeRepository.findByStoreId(storeId);

    const productCount = await this.storeRepository.getProductCount(storeId);

    const totalSoldCount = await this.storeRepository.getTotalSoldCount(storeId);

    const monthFavoriteCount = await this.storeRepository.getMonthFavoriteCount(storeId);

    return {
      ...myStoreDetail,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
      productCount,
      totalSoldCount,
      monthFavoriteCount,
    };
  }

  async userLikeRegister(userId: string, storeId: string) {
    const store = await this.storeRepository.findByStoreId(storeId);

    if (!store) {
      throw new Error('스토어가 존재하지 않습니다.');
    }

    await this.storeRepository.upsertLike(userId, storeId);

    return {
      type: 'register',
      store,
    };
  }

  async userLikeUnregister(userId: string, storeId: string) {
    await this.storeRepository.deleteLike(userId, storeId);
  }
}
