import {
  DashboardService,
  OrderItemWithOrder,
  DashboardOrderData,
} from '../../../src/features/dashboard/dashboard.service';
import { DashboardRepository } from '../../../src/features/dashboard/dashboard.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { Order } from '@prisma/client';

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  const dashboardRepository = {
    getDashboardData: jest.fn(),
    getProductForDashboard: jest.fn(),
  } as unknown as jest.Mocked<DashboardRepository>;

  beforeEach(() => {
    dashboardService = new DashboardService(dashboardRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findDashboard', () => {
    const userId = 'user-1';

    it('성공적으로 대시보드 데이터를 조회하고 통계를 계산', async () => {
      const mockOrderItem = (
        orderId: string,
        price: number,
        quantity: number,
        orderCreatedAt: Date,
      ): OrderItemWithOrder => ({
        id: `item-${Math.random()}`,
        orderId,
        productId: 'product-1',
        productName: '상품A',
        productImage: 'https://image.com/test.jpg',
        price,
        quantity,
        sizeId: 1,
        isReviewed: false,
        storeId: 'store-1',
        order: {
          id: orderId,
          createdAt: orderCreatedAt,
          updatedAt: orderCreatedAt,
          userId: 'user-1',
          status: 'CompletedPayment',
          name: '홍길동',
          address: '서울시 강남구',
          phoneNumber: '010-0000-0000',
          subtotal: price * quantity,
          totalQuantity: quantity,
          usePoint: 0,
          buyerId: 'buyer-1',
        } as unknown as Order,
      });

      const now = new Date();
      const mockOrdersData = {
        todayOrders: [mockOrderItem('order-1', 10000, 2, now)],
        yesterdayOrders: [mockOrderItem('order-2', 5000, 1, now)],
        weekOrders: [mockOrderItem('order-1', 10000, 2, now)],
        twoWeeksOrders: [],
        monthOrders: [mockOrderItem('order-1', 10000, 2, now)],
        twoMonthsOrders: [],
        yearOrders: [
          mockOrderItem('order-1', 10000, 2, now),
          mockOrderItem('order-3', 150000, 1, now),
        ],
        twoYearsOrders: [],
      };

      const mockTopProducts = [
        {
          productId: 'product-1',
          productName: '상품A',
          _sum: { quantity: 10 },
          revenue: 100000,
        },
      ];

      dashboardRepository.getDashboardData.mockResolvedValue(mockOrdersData);
      dashboardRepository.getProductForDashboard.mockResolvedValue(mockTopProducts);

      const result = await dashboardService.findDashboard(userId);

      expect(result.today.current.totalSales).toBe(20000);
      expect(result.today.current.totalOrders).toBe(1);
      expect(result.today.changeRate.totalSales).toBe(15000);

      const expensiveRange = result.priceRange.find((range) => range.priceRange === '10만원 이상');
      expect(expensiveRange?.totalSales).toBe(1);
      expect(expensiveRange?.percentage).toBe(33);

      expect(result.topSales).toHaveLength(1);
      expect(result.topSales[0].product.name).toBe('상품A');
      expect(result.topSales[0].product.price).toBe(10000);
    });

    it('주문 데이터가 없는 경우 404 에러를 출력', async () => {
      dashboardRepository.getDashboardData.mockResolvedValue(null as unknown as DashboardOrderData);

      await expect(dashboardService.findDashboard(userId)).rejects.toThrow(AppError);
      await expect(dashboardService.findDashboard(userId)).rejects.toMatchObject({
        statusCode: 404,
        message: '주문 정보를 찾을 수 없습니다.',
      });
    });

    it('주문 수량이 0일 때 빈 priceRange 배열을 출력해야한다.', async () => {
      const emptyOrdersData = {
        todayOrders: [],
        yesterdayOrders: [],
        weekOrders: [],
        twoWeeksOrders: [],
        monthOrders: [],
        twoMonthsOrders: [],
        yearOrders: [],
        twoYearsOrders: [],
      };

      dashboardRepository.getDashboardData.mockResolvedValue(emptyOrdersData);
      dashboardRepository.getProductForDashboard.mockResolvedValue([]);

      const result = await dashboardService.findDashboard(userId);
      expect(result.priceRange).toEqual([]);
    });
  });
});
