import { OrderRepository } from '../../../src/features/order/order.repository';
import prisma from '../../../src/lib/prisma';
import { Prisma, Order, OrderItem, Payment } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    stock: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
  },
}));

describe('OrderRepository', () => {
  let orderRepository: OrderRepository;

  const mockTx = {
    order: { create: jest.fn(), findUnique: jest.fn() },
    stock: { updateMany: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    product: { update: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    orderItem: { createMany: jest.fn() },
    payment: { create: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    orderRepository = new OrderRepository();
  });

  describe('findGradeByUserId', () => {
    it('유저의 등급 적립율을 출력해야 함', async () => {
      const userId = 'user-1';
      (mockTx.user.findUnique as jest.Mock).mockResolvedValue({
        grade: { rate: 5 },
      });

      const rate = await orderRepository.findGradeByUserId(mockTx, userId);

      expect(mockTx.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { grade: { select: { rate: true } } },
      });
      expect(rate).toBe(5);
    });

    it('유저나 등급이 없으면 0을 출력해야 함', async () => {
      (mockTx.user.findUnique as jest.Mock).mockResolvedValue(null);
      const rate = await orderRepository.findGradeByUserId(mockTx, 'none');
      expect(rate).toBe(0);
    });
  });

  describe('createOrderAndDecreaseStock', () => {
    const input = {
      userId: 'user-1',
      name: '홍길동',
      phone: '010-1234-5678',
      address: '서울시',
      usePoint: 1000,
      subtotal: 9000,
      totalQuantity: 1,
      items: [{ productId: 'prod-1', sizeId: 1, quantity: 1 }],
    };

    it('주문을 생성하고 재고를 감소되야 함', async () => {
      (mockTx.order.create as jest.Mock).mockResolvedValue({ id: 'order-1', ...input });
      (mockTx.stock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockTx.stock.findUnique as jest.Mock).mockResolvedValue({ quantity: 5 });
      (mockTx.stock.findMany as jest.Mock).mockResolvedValue([{ quantity: 5 }]);

      const result = await orderRepository.createOrderAndDecreaseStock(mockTx, input);

      expect(mockTx.order.create).toHaveBeenCalled();
      expect(mockTx.stock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1', sizeId: 1, quantity: { gte: 1 } },
          data: { quantity: { decrement: 1 } },
        }),
      );
      expect(result.order.id).toBe('order-1');
    });

    it('재고가 부족하면 에러를 출력', async () => {
      (mockTx.stock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(orderRepository.createOrderAndDecreaseStock(mockTx, input)).rejects.toThrow(
        'STOCK_NOT_ENOUGH',
      );
    });

    it('특정 사이즈 재고가 0이 되면 soldOutProductIds에 해당 정보가 포함되어야 함', async () => {
      (mockTx.order.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (mockTx.stock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockTx.stock.findUnique as jest.Mock).mockResolvedValue({ quantity: 0 });
      (mockTx.stock.findMany as jest.Mock).mockResolvedValue([{ quantity: 0 }, { quantity: 10 }]);

      const result = await orderRepository.createOrderAndDecreaseStock(mockTx, input);

      expect(result.soldOutProductIds).toContainEqual({ productId: 'prod-1', sizeId: 1 });
      expect(mockTx.product.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isSoldOut: true },
        }),
      );
    });

    it('재고가 0이 되면 상품을 품절 처리해야 함', async () => {
      (mockTx.order.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (mockTx.stock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockTx.stock.findUnique as jest.Mock).mockResolvedValue({ quantity: 0 });
      (mockTx.stock.findMany as jest.Mock).mockResolvedValue([{ quantity: 0 }]);

      await orderRepository.createOrderAndDecreaseStock(mockTx, input);

      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { isSoldOut: true },
        }),
      );
    });

    describe('incrementAmount', () => {
      it('유저의 총 구매액을 증가시키고 갱신된 정보를 반환해야 함', async () => {
        (mockTx.user.update as jest.Mock).mockResolvedValue({
          totalAmount: 150000,
          gradeId: 'grade_orange',
        });

        const result = await orderRepository.incrementAmount(mockTx, 'user-1', 50000);

        expect(result).toEqual({ totalAmount: 150000, gradeId: 'grade_orange' });
        expect(mockTx.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { totalAmount: { increment: 50000 } },
          }),
        );
      });
    });

    describe('incrementPoints', () => {
      it('트랜잭션 내에서 유저의 포인트를 증가되야 함', async () => {
        await orderRepository.incrementPoints(mockTx, 'user-1', 500);
        expect(mockTx.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: { points: { increment: 500 } },
        });
      });
    });

    describe('createOrderItemsAndPayment', () => {
      it('주문 항목들과 결제 정보를 생성해야 함', async () => {
        const items = [
          {
            productId: 'p1',
            sizeId: 1,
            quantity: 1,
            price: 1000,
            name: '상품',
            image: null,
            storeId: 's1',
          },
        ];

        await orderRepository.createOrderItemsAndPayment(mockTx, 'order-1', items, 1000);

        expect(mockTx.orderItem.createMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({ orderId: 'order-1', productId: 'p1' }),
          ]),
        });
        expect(mockTx.payment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ orderId: 'order-1', status: 'CompletedPayment' }),
        });
      });
    });

    describe('countOrders', () => {
      const userId = 'user-1';

      it('리뷰 작성 가능한(available) 주문 개수를 올바른 조건으로 조회해야 함', async () => {
        const params = { userId, reviewType: 'available' as const };

        await orderRepository.countOrders(params);

        expect(prisma.order.count).toHaveBeenCalledWith({
          where: {
            buyerId: userId,
            orderItems: {
              some: { isReviewed: false, productId: { not: null } },
            },
          },
        });
      });

      it('리뷰 작성 완료된(completed) 주문 개수를 올바른 조건으로 조회해야 함', async () => {
        const params = { userId, reviewType: 'completed' as const };

        await orderRepository.countOrders(params);

        expect(prisma.order.count).toHaveBeenCalledWith({
          where: {
            buyerId: userId,
            orderItems: {
              some: { isReviewed: true, productId: { not: null } },
            },
          },
        });
      });

      it('status 파라미터가 있을 때 결제 완료(CompletedPayment) 필터가 적용되어야 함', async () => {
        const params = { userId, status: 'some-status' };

        await orderRepository.countOrders(params);

        expect(prisma.order.count).toHaveBeenCalledWith({
          where: expect.objectContaining({
            buyerId: userId,
            payment: {
              status: 'CompletedPayment',
            },
          }),
        });
      });

      it('reviewType이 없을 때는 orderItems 필터가 포함되지 않아야 함', async () => {
        const params = { userId };

        await orderRepository.countOrders(params);

        const callArgs = (prisma.order.count as jest.Mock).mock.calls[0][0];
        expect(callArgs.where.orderItems).toBeUndefined();
        expect(callArgs.where.buyerId).toBe(userId);
      });
    });

    describe('findOrderWithRelations', () => {
      const orderId = 'test-order-id';

      it('주문 ID를 통해 관련 정보(items, payment, stocks 등)를 포함하여 조회해야 함', async () => {
        await orderRepository.findOrderWithRelations(orderId);

        expect(prisma.order.findUnique).toHaveBeenCalledWith({
          where: { id: orderId },
          include: {
            orderItems: {
              include: {
                review: true,
                product: {
                  include: {
                    store: true,
                    stocks: {
                      include: { size: true },
                    },
                  },
                },
                size: true,
              },
            },
            payment: true,
          },
        });
      });

      it('존재하지 않는 ID로 조회 시 null을 반환해야 함', async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await orderRepository.findOrderWithRelations('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('findOrders', () => {
      it('status 파라미터가 없을 때 기본 결제 상태 필터가 적용되어야 함', async () => {
        await orderRepository.findOrders({ userId: 'user-1', skip: 0, take: 5 });

        expect(prisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              payment: { status: { in: ['CompletedPayment', 'WaitingPayment'] } },
            }),
          }),
        );
      });

      it('리뷰 작성 가능한 주문 목록을 조회해야 함', async () => {
        const params = { userId: 'user-1', skip: 0, take: 10, reviewType: 'available' as const };

        await orderRepository.findOrders(params);

        expect(prisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              buyerId: 'user-1',
              orderItems: { some: { isReviewed: false, productId: { not: null } } },
            }),
            orderBy: { createdAt: 'desc' },
            include: expect.anything(),
          }),
        );
      });

      it('리뷰 작성이 완료된 주문 목록을 조회해야 함', async () => {
        const params = { userId: 'user-1', skip: 0, take: 10, reviewType: 'completed' as const };

        await orderRepository.findOrders(params);

        expect(prisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              buyerId: 'user-1',
              orderItems: { some: { isReviewed: true, productId: { not: null } } },
            }),
            orderBy: { createdAt: 'desc' },
            include: expect.anything(),
          }),
        );
      });

      it('리뷰 조건이 없을 때는 모든 주문을 조회해야 함', async () => {
        const params = { userId: 'user-1', skip: 0, take: 5 };

        await orderRepository.findOrders(params);

        const callArgs = (prisma.order.findMany as jest.Mock).mock.calls[0][0];
        expect(callArgs.where.orderItems).toBeUndefined();
      });
    });
  });

  describe('OrderRepository - Mutations', () => {
    const mockTx = {
      user: { update: jest.fn() },
      stock: { update: jest.fn() },
      payment: { update: jest.fn() },
    } as unknown as Prisma.TransactionClient;

    const mockDb = {
      order: { update: jest.fn() },
    } as unknown as DbClient;

    describe('updateGradeByUserId', () => {
      it('사용자의 등급을 올바르게 업데이트해야 함', async () => {
        const userId = 'user-123';
        const gradeId = 'grade-vip';

        await orderRepository.updateGradeByUserId(mockTx, userId, gradeId);

        expect(mockTx.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: { gradeId: gradeId },
        });
      });
    });

    describe('deleteOrder', () => {
      type OrderToDelete = Order & {
        orderItems: OrderItem[];
        payment: Payment | null;
      };

      it('주문 삭제 시 재고를 증가시키고 결제 상태를 CancelledPayment로 변경해야 함', async () => {
        const mockOrder = {
          id: 'order-1',
          orderItems: [
            { productId: 'prod-1', sizeId: 1, quantity: 2 } as OrderItem,
            { productId: 'prod-2', sizeId: 2, quantity: 1 } as OrderItem,
          ],
          payment: { id: 'pay-1' } as Payment,
        } as OrderToDelete;

        await orderRepository.deleteOrder(mockTx, mockOrder);

        expect(mockTx.stock.update).toHaveBeenCalledWith({
          where: {
            productId_sizeId: { productId: 'prod-1', sizeId: 1 },
          },
          data: { quantity: { increment: 2 } },
        });

        expect(mockTx.payment.update).toHaveBeenCalledWith({
          where: { id: 'pay-1' },
          data: { status: 'CancelledPayment' },
        });
      });

      it('productId가 없는 아이템은 재고 업데이트를 건너뛰어야 함', async () => {
        const mockOrder = {
          orderItems: [{ productId: null, sizeId: 1, quantity: 1 } as OrderItem],
          payment: null,
        } as OrderToDelete;

        await orderRepository.deleteOrder(mockTx, mockOrder);

        expect(mockTx.stock.update).not.toHaveBeenCalled();
      });
    });

    describe('updateOrder', () => {
      it('주문 정보를 올바르게 업데이트해야 함', async () => {
        const orderId = 'order-1';
        const updateData = { address: 'new address', phoneNumber: '010-1234-5678' };

        await orderRepository.updateOrder(mockDb, orderId, updateData);

        expect(mockDb.order.update).toHaveBeenCalledWith({
          where: { id: orderId },
          data: updateData,
        });
      });
    });
  });

  describe('OrderRepository - Additional Methods', () => {
    const mockTx = {
      cartItem: { deleteMany: jest.fn() },
      order: { findUnique: jest.fn() },
    } as unknown as jest.Mocked<Prisma.TransactionClient>;

    describe('removeOrderedItems', () => {
      it('장바구니에서 주문된 아이템들을 올바른 OR 조건으로 삭제해야 함', async () => {
        const userId = 'user-123';
        const items = [
          { productId: 'p1', sizeId: 1 },
          { productId: 'p2', sizeId: 2 },
        ];

        await orderRepository.removeOrderedItems(mockTx, userId, items);

        expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
          where: {
            cart: { buyerId: userId },
            OR: [
              { productId: 'p1', sizeId: 1 },
              { productId: 'p2', sizeId: 2 },
            ],
          },
        });
      });
    });

    describe('findOrderWithRelationForTx', () => {
      it('트랜잭션 내에서 주문 관계 데이터를 포함하여 조회해야 함', async () => {
        const orderId = 'order-999';

        await orderRepository.findOrderWithRelationForTx(mockTx, orderId);

        expect(mockTx.order.findUnique).toHaveBeenCalledWith({
          where: { id: orderId },
          include: expect.objectContaining({
            orderItems: {
              include: expect.objectContaining({
                product: {
                  include: expect.objectContaining({
                    store: true,
                    stocks: { include: { size: true } },
                  }),
                },
                size: true,
                review: true,
              }),
            },
            payment: true,
          }),
        });
      });
    });

    describe('updateOrderInfo', () => {
      it('주문 정보를 업데이트하고 연관된 모든 관계 데이터를 반환해야 함', async () => {
        const orderId = 'order-info-1';
        const updateData = { name: '홍길동', address: '서울시 강남구' };

        await orderRepository.updateOrderInfo(orderId, updateData);

        // 전역 prisma.order.update가 호출되었는지 확인
        expect(prisma.order.update).toHaveBeenCalledWith({
          where: { id: orderId },
          data: updateData,
          include: expect.objectContaining({
            orderItems: {
              include: expect.objectContaining({
                product: {
                  include: expect.objectContaining({
                    reviews: true, // updateOrderInfo에만 포함된 필드
                    stocks: { include: { size: true } },
                  }),
                },
              }),
            },
          }),
        });
      });
    });
  });
});
