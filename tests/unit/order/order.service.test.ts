import { OrderService } from '../../../src/features/order/order.service';
import { OrderRepository } from '../../../src/features/order/order.repository';
import { NotificationService } from '../../../src/features/notification/notification.service';
import { GradeService } from '../../../src/features/metadata/grade/grade.service';
import prisma from '../../../src/lib/prisma';
import { AppError } from '../../../src/shared/middleware/error-handler';
import type { AuthUser } from '../../../src/shared/types/auth';
import { OrderMapper } from '../../../src/features/order/order.mapper';

type MockOrderWithAllRelations = Exclude<
  Awaited<ReturnType<OrderRepository['findOrderWithRelations']>>,
  null
>;
type MockUpdatedOrder = Awaited<ReturnType<OrderRepository['updateOrderInfo']>>;

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    product: { findMany: jest.fn() },
    user: { update: jest.fn() },
  },
}));

describe('OrderService', () => {
  let orderService: OrderService;

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
    findOrderWithRelations: jest.fn(),
    updateOrderInfo: jest.fn(),
    deleteOrder: jest.fn(),
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
      phone: '010-1234-5678',
      address: '천안시',
      usePoint: 0,
      orderItems: [{ productId: 'product-1', sizeId: 1, quantity: 2 }],
    };
    const baseMockOrder = {
      id: 'order-1',
      name: '홍길동',
      phoneNumber: '010-1234-5678',
      address: '천안시',
      subtotal: 20000,
      totalQuantity: 2,
      usePoint: 0,
      buyerId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      orderItems: [],
      payment: null,
    };

    const mockOrderWithPayment = {
      ...baseMockOrder,
      payment: {
        id: 'pay-1',
        status: 'CompletedPayment',
        price: 20000,
        orderId: 'order-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as unknown as MockOrderWithAllRelations;

    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));

      orderRepository.createOrderAndDecreaseStock.mockResolvedValue({
        order: baseMockOrder,
        soldOutProductIds: [],
      });
      orderRepository.findGradeByUserId.mockResolvedValue(5);
      orderRepository.incrementAmount.mockResolvedValue({ totalAmount: 50000, gradeId: 'gold' });

      orderRepository.findOrderWithRelationForTx.mockResolvedValue(mockOrderWithPayment);
    });

    it('재고가 부족할 경우 AppError를 던져야 한다', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', price: 10000, name: '상품1', storeId: 'store-1' },
      ]);

      orderRepository.createOrderAndDecreaseStock.mockRejectedValue(new Error('STOCK_NOT_ENOUGH'));

      await expect(orderService.createOrder(userId, createOrderDto)).rejects.toThrow(
        new AppError(400, '재고가 부족한 상품이 있습니다.'),
      );
    });

    it('할인 기간 내의 상품은 할인가를 적용하여 주문 총액을 계산해야 한다', async () => {
      const mockProduct = {
        id: 'product-1',
        price: 10000,
        discountRate: 10,
        discountStartTime: new Date(Date.now() - 10000),
        discountEndTime: new Date(Date.now() + 10000),
        storeId: 'store-1',
        name: '할인상품',
      };
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      await orderService.createOrder(userId, createOrderDto);

      expect(orderRepository.createOrderAndDecreaseStock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subtotal: 18000 }),
      );
    });

    it('포인트 사용 시, 사용 금액을 제외한 실제 결제 금액에 대해 적립금을 계산해야 한다', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', price: 10000, storeId: 'store-1', name: '상품', discountRate: 0 },
      ]);

      const dtoWithPoint = { ...createOrderDto, usePoint: 2000 };

      const result = await orderService.createOrder(userId, dtoWithPoint);

      const expectedResult = OrderMapper.toOrderResponseDto(mockOrderWithPayment);

      expect(result).toEqual(expectedResult);
      expect(orderRepository.incrementPoints).toHaveBeenCalledWith(expect.anything(), userId, 900);
    });

    it('주문 완료 후 품절된 상품이 있다면 알림 서비스를 호출해야 한다', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', price: 1000, storeId: 'store-1', name: '상품' },
      ]);

      orderRepository.createOrderAndDecreaseStock.mockResolvedValue({
        order: baseMockOrder,
        soldOutProductIds: [{ productId: 'product-1', sizeId: 1 }],
      });

      await orderService.createOrder(userId, createOrderDto);

      expect(notificationService.createSoldOutNotification).toHaveBeenCalledWith([
        { productId: 'product-1', sizeId: 1 },
      ]);
    });
  });

  describe('getOrders', () => {
    it('주문 목록과 페이지네이션 메타데이터를 출력해야 한다', async () => {
      const params = { userId: 'user-1', page: 1, limit: 10 };

      const mockOrders = [
        {
          id: 'order-1',
          name: '홍길동',
          phoneNumber: '010-1234-5678',
          address: '천안시',
          subtotal: 10000,
          totalQuantity: 1,
          usePoint: 0,
          buyerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          orderItems: [],
          payment: {
            id: 'payment-1',
            status: 'CompletedPayment',
            price: 10000,
            orderId: 'order-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      orderRepository.findOrders.mockResolvedValue(
        mockOrders as unknown as MockOrderWithAllRelations[],
      );
      orderRepository.countOrders.mockResolvedValue(1);

      const result = await orderService.getOrders(params);

      const expectedData = mockOrders.map((order) =>
        OrderMapper.toOrderResponseDto(order as unknown as MockOrderWithAllRelations),
      );

      expect(result.data).toEqual(expectedData);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getOrderById', () => {
    it('본인의 주문일 경우 주문 상세 정보를 출력해야 한다', async () => {
      const mockOrder: MockOrderWithAllRelations = {
        id: 'order-1',
        buyerId: 'user-123',
        name: '홍길동',
        phoneNumber: '010-1234-5678',
        address: '천안시',
        subtotal: 20000,
        totalQuantity: 2,
        usePoint: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        payment: {
          id: 'pay-1',
          status: 'CompletedPayment',
          price: 20000,
          orderId: 'order-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        orderItems: [],
      } as MockOrderWithAllRelations;

      orderRepository.findOrderWithRelations.mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById('order-1', 'user-123');

      expect(result).toEqual(OrderMapper.toOrderResponseDto(mockOrder!));
      expect(orderRepository.findOrderWithRelations).toHaveBeenCalledWith('order-1');
    });

    it('타인의 주문일 경우 403 에러를 던져야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'other-user',
      } as MockOrderWithAllRelations;

      orderRepository.findOrderWithRelations.mockResolvedValue(mockOrder);

      await expect(orderService.getOrderById('order-1', 'user-123')).rejects.toThrow(
        new AppError(403, '접근 권한이 없습니다.'),
      );
    });
  });

  describe('updateOrder', () => {
    const user = { id: 'user-123' } as AuthUser;
    const updateDto = {
      name: '홍길동',
      phone: '010-1234-5678',
      address: '천안시',
      orderItems: [],
      usePoint: 0,
    };

    it('결제 대기 중인 주문은 성공적으로 수정되어야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-123',
        name: '이전이름',
        phoneNumber: '010-1111-1111',
        address: '이전주소',
        subtotal: 20000,
        totalQuantity: 2,
        usePoint: 0,
        payment: {
          id: 'pay-1',
          price: 20000,
          status: 'WaitingPayment',
          orderId: 'order-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        orderItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as MockOrderWithAllRelations;

      const updatedOrder = {
        ...mockOrder,
        name: updateDto.name,
        phoneNumber: updateDto.phone,
        address: updateDto.address,
      } as MockUpdatedOrder;

      orderRepository.findOrderWithRelations.mockResolvedValue(mockOrder);
      orderRepository.updateOrderInfo.mockResolvedValue(updatedOrder);

      const result = await orderService.updateOrder('order-1', user, updateDto);

      expect(result).toEqual(OrderMapper.toOrderResponseDto(updatedOrder));
      expect(result.name).toBe('홍길동');
    });

    it('이미 결제가 완료된 주문을 수정하려 하면 400 에러를 던져야 한다', async () => {
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-123',
        payment: { status: 'CompletedPayment' },
      } as unknown as MockOrderWithAllRelations;

      orderRepository.findOrderWithRelations.mockResolvedValue(mockOrder);

      await expect(orderService.updateOrder('order-1', user, updateDto)).rejects.toThrow(
        new AppError(400, '결제 대기 상태인 주문만 수정/취소가 가능합니다.'),
      );
    });
  });

  describe('deleteOrder', () => {
    it('결제 대기 중인 주문을 삭제하면 리포지토리의 deleteOrder를 호출해야 한다', async () => {
      const user = { id: 'user-123' } as AuthUser;
      const mockOrder = {
        id: 'order-1',
        buyerId: 'user-123',
        payment: { status: 'WaitingPayment' },
      } as unknown as MockOrderWithAllRelations;
      orderRepository.findOrderWithRelations.mockResolvedValue(mockOrder);
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(prisma));

      await orderService.deleteOrder(user, 'order-1');

      expect(orderRepository.deleteOrder).toHaveBeenCalledWith(expect.anything(), mockOrder);
    });
  });
});
