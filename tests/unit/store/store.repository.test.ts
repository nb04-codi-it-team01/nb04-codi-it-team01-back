import prisma from '../../../src/lib/prisma';
import { StoreRepository } from '../../../src/features/store/store.repository';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userLike: {
      count: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      aggregate: jest.fn(),
    },
  },
}));

describe('StoreRepository', () => {
  let repository: StoreRepository;

  beforeEach(() => {
    repository = new StoreRepository();
    jest.clearAllMocks();
  });

  describe('findByUserId / findByStoreId', () => {
    const userId = 'user-1';
    const mockStore = {
      id: 'store-1',
      name: '나의 상점',
      address: '서울시',
      phoneNumber: '010-1234-5678',
      content: '상점 설명',
      userId: 'user-1',
    };

    it('userId로 스토어 조회', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(mockStore);
      const result = await repository.findByUserId(userId);

      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(mockStore);
    });

    it('storeId로 스토어 조회', async () => {
      const storeId = 'store-1';
      const result = await repository.findByStoreId(storeId);

      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: storeId },
      });
      expect(result).toEqual(mockStore);
    });
  });

  describe('create', () => {
    const userId = 'user-1';
    it('스토어 생성', async () => {
      const create = {
        name: '새 상점',
        address: '서울시',
        detailAddress: '구로구',
        phoneNumber: '010-0000-0000',
        content: '신규 오픈',
      };
      (prisma.store.create as jest.Mock).mockResolvedValue(create);

      const result = await repository.create(userId, create);

      expect(prisma.store.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...create,
        },
      });
      expect(result.name).toBe('새 상점');
    });
  });

  describe('update', () => {
    const storeId = 'store-1';

    it('스토어 수정', async () => {
      const update = {
        name: '상점 수정',
        address: '서울시',
        detailAddress: '구로구',
        phoneNumber: '010-0000-1234',
        content: '내용 수정',
      };
      (prisma.store.update as jest.Mock).mockResolvedValue(update);

      await repository.update(storeId, update);

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: update,
      });
    });

    it('특정 필드만 수정', async () => {
      const update = { name: '이름 변경' };
      (prisma.store.update as jest.Mock).mockResolvedValue(update);

      await repository.update(storeId, update);

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: storeId },
        data: update,
      });
    });
  });

  describe('getFavoriteCount', () => {
    const storeId = 'store-1';

    it('해당 스토어의 좋아요 총합', async () => {
      (prisma.userLike.count as jest.Mock).mockResolvedValue(5);
      const count = await repository.getFavoriteCount(storeId);

      expect(prisma.userLike.count).toHaveBeenCalledWith({ where: { storeId } });
      expect(count).toBe(5);
    });
  });

  describe('getProductCount', () => {
    const storeId = 'store-1';

    it('해당 스토어의 상품 총합', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(12);

      const count = await repository.getProductCount(storeId);

      expect(prisma.product.count).toHaveBeenCalledWith({ where: { storeId } });
      expect(count).toBe(12);
    });
  });

  describe('getTotalSoldCount', () => {
    const storeId = 'store-1';

    it('특정 스토어의 모든 상품 판매 수량', async () => {
      (prisma.orderItem.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: 50 },
      });

      const result = await repository.getTotalSoldCount(storeId);

      expect(prisma.orderItem.aggregate).toHaveBeenCalledWith({
        _sum: { quantity: true },
        where: {
          product: { storeId },
        },
      });
      expect(result).toBe(50);
    });
  });

  describe('getMonthFavoriteCount', () => {
    it('최근 30일 이내의 좋아요 개수만 필터링하여 카운트해야 한다', async () => {
      (prisma.userLike.count as jest.Mock).mockResolvedValue(10);

      const storeId = 'store-1';
      await repository.getMonthFavoriteCount(storeId);

      const callArgs = (prisma.userLike.count as jest.Mock).mock.calls[0][0];
      const gteDate = callArgs.where.createdAt.gte;

      expect(callArgs.where.storeId).toBe(storeId);
      expect(gteDate instanceof Date).toBe(true);
    });
  });

  describe('findProductsByStore', () => {
    const storeId = 'store-1';
    const mockProducts = [{ id: 'p1', name: '상품1' }];

    it('페이지네이션 인자가 올바르게 계산되어 쿼리에 전달되어야 한다', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(100);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const page = 3;
      const pageSize = 10;
      const result = await repository.findProductsByStore(storeId, page, pageSize);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { storeId },
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { stocks: true },
      });
      expect(result.totalCount).toBe(100);
      expect(result.products).toEqual(mockProducts);
    });
  });

  describe('Like 관련 기능', () => {
    const userId = 'user-1';
    const storeId = 'store-1';

    it('좋아요 등록', async () => {
      await repository.upsertLike(userId, storeId);

      expect(prisma.userLike.upsert).toHaveBeenCalledWith({
        where: { userId_storeId: { userId, storeId } },
        create: { userId, storeId },
        update: {},
      });
    });

    it('좋아요 취소', async () => {
      await repository.deleteLike(userId, storeId);

      expect(prisma.userLike.delete).toHaveBeenCalledWith({
        where: { userId_storeId: { userId, storeId } },
      });
    });
  });
});
