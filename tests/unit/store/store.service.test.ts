import { StoreService } from '../../../src/features/store/store.service';
import { StoreRepository } from '../../../src/features/store/store.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { UserType } from '../../../src/shared/types/auth';

describe('StoreService', () => {
  let service: StoreService;

  const mockStoreRepository = {
    findByUserId: jest.fn(),
    findByStoreId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getFavoriteCount: jest.fn(),
    getProductCount: jest.fn(),
    getTotalSoldCount: jest.fn(),
    getMonthFavoriteCount: jest.fn(),
    findProductsByStore: jest.fn(),
    upsertLike: jest.fn(),
    deleteLike: jest.fn(),
  };

  const MOCK_STORE = {
    id: 'store-1',
    userId: 'user-1',
    name: '기본 상점',
    address: '서울',
    detailAddress: '구로구',
    phoneNumber: '010-1234-5678',
    content: '상점 설명',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new StoreService(mockStoreRepository as unknown as StoreRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: '새 상점',
      address: '경기도',
      detailAddress: '부천시',
      phoneNumber: '010-0000-0000',
      content: '신규 오픈',
    };

    it('판매자(SELLER)가 아니면 에러를 던져야 한다', async () => {
      await expect(
        service.create(MOCK_STORE.userId, 'BUYER' as UserType, createDto),
      ).rejects.toThrow(new AppError(403, '판매자만 스토어를 생성할 수 있습니다.'));
    });

    it('이미 스토어가 존재하는 유저라면 에러를 던져야 한다', async () => {
      mockStoreRepository.findByUserId.mockResolvedValue(MOCK_STORE);

      await expect(service.create(MOCK_STORE.userId, 'SELLER', createDto)).rejects.toThrow(
        new AppError(409, '이미 해당 유저의 스토어가 존재합니다.'),
      );
    });

    it('스토어 생성 성공', async () => {
      mockStoreRepository.findByUserId.mockResolvedValue(null);
      mockStoreRepository.create.mockResolvedValue({ ...MOCK_STORE, ...createDto });

      const result = await service.create(MOCK_STORE.userId, 'SELLER', createDto);

      expect(mockStoreRepository.create).toHaveBeenCalled();
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('update', () => {
    const updateDto = { name: '수정된 상점명' };

    it('스토어 주인이 아니면 에러를 던져야 한다', async () => {
      // 주인이 다른 상점 정보 반환
      mockStoreRepository.findByStoreId.mockResolvedValue({ ...MOCK_STORE, userId: 'other-user' });

      await expect(service.update(MOCK_STORE.userId, MOCK_STORE.id, updateDto)).rejects.toThrow(
        new AppError(403, '권한이 없습니다.'),
      );
    });

    it('스토어 수정 성공', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.update.mockResolvedValue({ ...MOCK_STORE, ...updateDto });

      const result = await service.update(MOCK_STORE.userId, MOCK_STORE.id, updateDto);

      expect(mockStoreRepository.update).toHaveBeenCalledWith(MOCK_STORE.id, updateDto);
      expect(result.name).toBe('수정된 상점명');
    });
  });

  describe('getStoreDetail', () => {
    const storeId = MOCK_STORE.id;

    it('스토어 상세 조회 성공', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.getFavoriteCount.mockResolvedValue(50);

      const result = await service.getStoreDetail(storeId);

      expect(mockStoreRepository.findByStoreId).toHaveBeenCalledWith(storeId);
      expect(mockStoreRepository.getFavoriteCount).toHaveBeenCalledWith(storeId);
      expect(result.favoriteCount).toBe(50);
      expect(result.id).toBe(storeId);
    });

    it('존재하지 않는 스토어 ID로 조회 시 404 에러를 던져야 한다', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(null);

      await expect(service.getStoreDetail('wrong-id')).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );
    });
  });

  describe('getMyStoreDetail', () => {
    it('내 스토어 상세 조회 성공', async () => {
      mockStoreRepository.findByUserId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.getFavoriteCount.mockResolvedValue(10);
      mockStoreRepository.getProductCount.mockResolvedValue(5);
      mockStoreRepository.getTotalSoldCount.mockResolvedValue(100);
      mockStoreRepository.getMonthFavoriteCount.mockResolvedValue(2);

      const result = await service.getMyStoreDetail(MOCK_STORE.userId);

      expect(result.favoriteCount).toBe(10);
      expect(result.totalSoldCount).toBe(100);
      expect(result).toHaveProperty('name', MOCK_STORE.name);
    });
  });

  describe('getMyProducts', () => {
    it('내 스토어의 상품 조회 성공', async () => {
      const now = new Date();
      const mockProducts = [
        {
          ...MOCK_STORE,
          id: 'p1',
          name: '상품 1',
          price: 10000,
          discountRate: 10,
          discountStartTime: new Date(now.getTime() - 10000), // 할인 중
          discountEndTime: new Date(now.getTime() + 10000),
          stocks: [{ quantity: 10 }, { quantity: 5 }], // 총 재고 15
          isSoldOut: false,
        },
      ];

      mockStoreRepository.findByUserId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.findProductsByStore.mockResolvedValue({
        totalCount: 1,
        products: mockProducts,
      });

      const result = await service.getMyProducts(MOCK_STORE.userId);

      expect(result).toEqual({
        totalCount: 1,
        list: [
          {
            id: 'p1',
            image: '',
            name: '상품 1',
            price: 10000,
            stock: 15,
            isDiscount: true,
            createdAt: mockProducts[0]!.createdAt.toISOString(),
            isSoldOut: false,
          },
        ],
      });
    });
  });

  describe('userLikeRegister', () => {
    const userId = 'user-1';
    const storeId = 'store-1';

    it('좋아요 등록 성공', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.upsertLike.mockResolvedValue(undefined);

      const result = await service.userLikeRegister(userId, storeId);

      expect(mockStoreRepository.findByStoreId).toHaveBeenCalledWith(storeId);
      expect(mockStoreRepository.upsertLike).toHaveBeenCalledWith(userId, storeId);
      expect(result).toEqual({
        type: 'register',
        store: expect.objectContaining({ id: storeId }),
      });
    });

    it('스토어가 존재하지 않으면 좋아요를 등록할 수 없다', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(null);

      await expect(service.userLikeRegister(userId, storeId)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );
    });
  });

  describe('userLikeUnregister', () => {
    const userId = 'user-1';
    const storeId = 'store-1';

    it('좋아요 취소 성공', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(MOCK_STORE);
      mockStoreRepository.deleteLike.mockResolvedValue(undefined);

      await service.userLikeUnregister(userId, storeId);

      expect(mockStoreRepository.findByStoreId).toHaveBeenCalledWith(storeId);
      expect(mockStoreRepository.deleteLike).toHaveBeenCalledWith(userId, storeId);
    });

    it('스토어가 존재하지 않으면 좋아요를 취소할 때 404 에러를 던져야 한다', async () => {
      mockStoreRepository.findByStoreId.mockResolvedValue(null);

      await expect(service.userLikeUnregister(userId, storeId)).rejects.toThrow(
        new AppError(404, '스토어가 존재하지 않습니다.'),
      );
    });
  });
});
