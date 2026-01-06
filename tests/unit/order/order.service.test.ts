import { OrderService } from '../../../src/features/order/order.service';
import { OrderRepository } from '../../../src/features/order/order.repository';
import { NotificationService } from '../../../src/features/notification/notification.service';
import { GradeService } from '../../../src/features/metadata/grade/grade.service';
import prisma from '../../../src/lib/prisma';
import { AppError } from '../../../src/shared/middleware/error-handler';
import { Order } from '@prisma/client';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    product: { findMany: jest.fn() },
    user: { update: jest.fn() },
  },
}));

// 수정된 선언 및 초기화 부분
describe('OrderService', () => {
  let orderService: OrderService;

  // 타입을 명시적으로 지정
  const orderRepository = {
    findOrders: jest.fn(),
    countOrders: jest.fn(),
    createOrderAndDecreaseStock: jest.fn(),
    findGradeByUserId: jest.fn(),
    incrementPoints: jest.fn(),
    incrementAmount: jest.fn(),
    createOrderItemsAndPayment: jest.fn(),
    removeOrderedItems: jest.fn(),
    findOrderWithRelationForTx: jest.fn(),
  } as unknown as jest.Mocked<OrderRepository>;

  const notificationService = {
    createSoldOutNotification: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;

  const gradeService = {
    syncUserGrade: jest.fn(),
  } as unknown as jest.Mocked<GradeService>;

  beforeEach(() => {
    orderService = new OrderService(
      orderRepository as unknown as OrderRepository,
      notificationService as unknown as NotificationService,
      gradeService as unknown as GradeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const userId = 'user-123';
    const createOrderDto = {
      name: '홍길동',
      phone: '0101234-5678',
      address: '서울시 강남구',
      usePoint: 0,
      orderItems: [{ productId: 'prod-1', sizeId: 1, quantity: 2 }],
    };

    it('재고가 부족할 경우 AppError를 던져야 한다', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', price: 10000, name: '상품1', storeId: 'store-1' },
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prisma);
      });

      orderRepository.createOrderAndDecreaseStock.mockRejectedValue(new Error('STOCK_NOT_ENOUGH'));

      await expect(orderService.createOrder(userId, createOrderDto)).rejects.toThrow(
        new AppError(400, '재고가 부족한 상품이 있습니다.'),
      );
    });

    it('정상적인 주문 생성 시 포인트를 적립하고 장바구니를 비워야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: userId,
        name: '홍길동',
        phoneNumber: '0101234-5678',
        address: '서울시...',
        subtotal: 18000,
        totalQuantity: 2,
        usePoint: 0,
        createdAt: new Date(),
        orderItems: [],
        payment: {
          status: 'CompletedPayment',
          price: 18000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockProduct = {
        id: 'prod-1',
        price: 10000,
        name: '상품1',
        createdAt: new Date(),
        updatedAt: new Date(),
        storeId: 'store-1',
        discountRate: 10,
      };
      const mockOrderWithRelation = {
        ...mockOrder,
        orderItems: [], // 필요하다면 에러 메시지에 명시된 구조대로 [] 내부에 데이터를 채웁니다.
        payment: {
          id: 'pay-1',
          status: 'CompletedPayment' as const, // enum 타입일 경우 as const 추가
          price: 18000,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderId: 'order-1',
        },
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));

      orderRepository.createOrderAndDecreaseStock.mockResolvedValue({
        order: mockOrder as unknown as Order,
        soldOutProductIds: [],
      });
      orderRepository.findGradeByUserId.mockResolvedValue(5);
      orderRepository.incrementAmount.mockResolvedValue({ totalAmount: 50000, gradeId: 'gold' });

      orderRepository.findOrderWithRelationForTx.mockResolvedValue(
        mockOrderWithRelation as unknown as Awaited<
          ReturnType<typeof orderRepository.findOrderWithRelationForTx>
        >,
      );

      const result = await orderService.createOrder(userId, createOrderDto);

      expect(result).toBeDefined();
      expect(orderRepository.createOrderAndDecreaseStock).toHaveBeenCalled();
      expect(orderRepository.incrementPoints).toHaveBeenCalledWith(expect.anything(), userId, 900);
      expect(orderRepository.removeOrderedItems).toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('주문 목록과 페이지네이션 메타데이터를 반환해야 한다', async () => {
      const params = { userId: 'user-1', page: 1, limit: 10 };
      const mockOrders = [
        {
          id: 'order-1',
          name: '홍길동',
          phoneNumber: '010-1234-5678',
          address: '서울시...',
          subtotal: 10000,
          totalQuantity: 1,
          usePoint: 0,
          buyerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          orderItems: [],
          payment: {
            id: 'pay-1',
            status: 'CompletedPayment',
            price: 10000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      orderRepository.findOrders.mockResolvedValue(
        mockOrders as unknown as Awaited<ReturnType<typeof orderRepository.findOrders>>,
      );
      orderRepository.countOrders.mockResolvedValue(1);

      const result = await orderService.getOrders(params);

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalPages).toBe(1);
      expect(orderRepository.findOrders).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 10,
        status: undefined,
        reviewType: undefined,
      });
    });
  });
});
