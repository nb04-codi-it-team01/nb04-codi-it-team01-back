import { CreateStoreDto, MyStoreDetailDto, StoreResponseDto, UpdateStoreDto } from './store.dto';
import { mapStoreToResponse } from './store.mapper';
import { StoreRepository } from './store.repository';
import { AppError } from '../../shared/middleware/error-handler';

export class StoreService {
  constructor(private readonly storeRepository = new StoreRepository()) {}

  async create(userId: string, userType: string, data: CreateStoreDto): Promise<StoreResponseDto> {
    if (userType !== 'SELLER') {
      throw new AppError(403, '판매자만 스토어를 생성할 수 있습니다.');
    }
    
    const existingStore = await this.storeRepository.findByUserId(userId);

    if (existingStore) {
      throw new AppError(409, '이미 해당 유저의 스토어가 존재합니다.');
    }

    const store = await this.storeRepository.create(userId, data);

    return mapStoreToResponse(store);
  }

  async update(userId: string, storeId: string, data: UpdateStoreDto): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findByStoreId(storeId);
    if (!store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.');
    }

    if (store.userId !== userId) {
      throw new AppError(403, '본인의 스토어만 수정할 수 있습니다.');
    }

    const updatedStore = await this.storeRepository.update(storeId, data);

    return mapStoreToResponse(updatedStore);
  }

  async getStoreDetail(storeId: string): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findByStoreId(storeId);

    if (!store) throw new AppError(404, '스토어가 존재하지 않습니다.');

    const favoriteCount = await this.storeRepository.getFavoriteCount(storeId);

    return {
      ...mapStoreToResponse(store),
      favoriteCount: favoriteCount,
    };
  }

  async getMyStoreDetail(userId: string): Promise<MyStoreDetailDto> {
    const store = await this.storeRepository.findByUserId(userId);

    if (!store) throw new AppError(404, '스토어가 존재하지 않습니다.');

    const storeId = store.id;

    const [favoriteCount, productCount, totalSoldCount, monthFavoriteCount] =
      await Promise.all([
        this.storeRepository.getFavoriteCount(storeId),
        this.storeRepository.getProductCount(storeId),
        this.storeRepository.getTotalSoldCount(storeId),
        this.storeRepository.getMonthFavoriteCount(storeId),
      ]);

    return {
      ...mapStoreToResponse(store),
      productCount: productCount,
      favoriteCount: favoriteCount,
      monthFavoriteCount: monthFavoriteCount,
      totalSoldCount: totalSoldCount,
    };
  }

  async userLikeRegister(userId: string, storeId: string) {
    const store = await this.storeRepository.findByStoreId(storeId);

    if (!store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.');
    }

    await this.storeRepository.upsertLike(userId, storeId);

    return {
      type: 'register',
      store: mapStoreToResponse(store),
    };
  }

  async userLikeUnregister(userId: string, storeId: string) {
    const store = await this.storeRepository.findByStoreId(storeId);

    if (!store) {
      throw new AppError(404, '스토어가 존재하지 않습니다.');
    }

    await this.storeRepository.deleteLike(userId, storeId);
  }
}
