import { DashboardRepository } from '../../../src/features/dashboard/dashboard.repository';
import prisma from '../../../src/lib/prisma';
import { Prisma, Store, OrderItem } from '@prisma/client';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    store: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
  },
}));

describe('DashboardRepository', () => {
  let dashboardRepository: DashboardRepository;

  const mockedStoreFindUnique = jest.mocked(prisma.store.findUnique);
  const mockedOrderItemFindMany = jest.mocked(prisma.orderItem.findMany);

  beforeEach(() => {
    dashboardRepository = new DashboardRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    const userId = 'userId-1';
    const storeId = 'storeId-1';

    it('스토어를 찾고, 주문 아이템들을 기간별로 분류하여 출력', async () => {
      mockedStoreFindUnique.mockResolvedValue({
        id: storeId,
      } as Store);

      const now = new Date();

      type OrderItemWithOrder = Prisma.OrderItemGetPayload<{
        include: { order: true };
      }>;

      const mockItems: OrderItemWithOrder[] = [
        {
          id: 'item-1',
          orderId: 'order-1',
          productId: 'product-1',
          sizeId: 1,
          price: 10000,
          quantity: 1,
          isReviewed: false,
          productName: '상품A',
          productImage: null,
          storeId: storeId,
          order: {
            id: 'order-1',
            createdAt: now,
            updatedAt: now,
            buyerId: 'user-1',
            name: '홍길동',
            address: '천안시',
            phoneNumber: '010-1234-5678',
            subtotal: 10000,
            totalQuantity: 1,
            usePoint: 0,
          },
        },
        {
          id: 'item-2',
          orderId: 'order-2',
          productId: 'product-2',
          sizeId: 2,
          price: 20000,
          quantity: 1,
          isReviewed: false,
          productName: '상품B',
          productImage: null,
          storeId: storeId,
          order: {
            id: 'order-2',
            createdAt: new Date(now.getTime() - 86400000),
            updatedAt: now,
            name: '홍길동',
            address: '천안시',
            phoneNumber: '010-1234-5678',
            subtotal: 20000,
            totalQuantity: 1,
            usePoint: 0,
            buyerId: null,
          },
        },
      ];

      mockedOrderItemFindMany.mockResolvedValue(mockItems);

      const result = await dashboardRepository.getDashboardData(userId);

      expect(mockedStoreFindUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });

      expect(result.todayOrders).toHaveLength(1);
      expect(result.yesterdayOrders).toHaveLength(1);
      expect(result.todayOrders[0].id).toBe('item-1');
    });

    it('스토어가 존재하지 않으면 에러 출력', async () => {
      mockedStoreFindUnique.mockResolvedValue(null);

      await expect(dashboardRepository.getDashboardData(userId)).rejects.toThrow('Store not found');
    });
  });

  describe('getProductForDashboard', () => {
    const userId = 'userId-1';

    it('상품별 데이터를 집계하여 상위 5개를 출력', async () => {
      mockedStoreFindUnique.mockResolvedValue({ id: 'store-1' } as Store);

      const mockItems = [
        { productId: 'product-1', productName: '상품A', quantity: 10, price: 1000 },
        { productId: 'product-2', productName: '상품B', quantity: 5, price: 2000 },
        { productId: 'product-3', productName: '상품C', quantity: 7, price: 3000 },
        { productId: 'product-4', productName: '상품D', quantity: 6, price: 4000 },
        { productId: 'product-5', productName: '상품E', quantity: 9, price: 5000 },
        { productId: 'product-6', productName: '상품F', quantity: 8, price: 6000 },
      ] as OrderItem[];

      mockedOrderItemFindMany.mockResolvedValue(mockItems);

      const result = await dashboardRepository.getProductForDashboard(userId);

      expect(result).toHaveLength(5);
      expect(result[0].productName).toBe('상품A');
      expect(result[0]._sum.quantity).toBe(10);
      expect(result[0].revenue).toBe(10000);
    });

    it('스토어가 없으면 빈 배열을 출력', async () => {
      mockedStoreFindUnique.mockResolvedValue(null);

      const result = await dashboardRepository.getProductForDashboard(userId);
      expect(result).toEqual([]);
    });
  });
});
