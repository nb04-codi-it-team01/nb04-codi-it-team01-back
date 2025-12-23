import { OrderRepository } from './order.repository';
import { OrderMapper } from './order.mapper';
import type {
  UpdateOrderDto,
  OrderPaginatedResponseDto,
  CreateOrderDto,
  OrderResponseDto,
} from './order.dto';
import { AppError } from '../../shared/middleware/error-handler';
import prisma from '../../lib/prisma';
import type { AuthUser } from '../../shared/types/auth';
import { PaymentStatus } from '@prisma/client';

interface GetOrdersParams {
  userId: string;
  page: number;
  limit: number;
  status?: string;
}

export class OrderService {
  constructor(private readonly orderRepository = new OrderRepository()) {}

  async getOrders(params: GetOrdersParams): Promise<OrderPaginatedResponseDto> {
    const { userId, page, limit, status } = params;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderRepository.findOrders({
        userId,
        skip,
        take: limit,
        status,
      }),
      this.orderRepository.countOrders({
        userId,
        status,
      }),
    ]);

    return {
      data: orders.map(OrderMapper.toOrderResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    return prisma.$transaction(async (tx) => {
      const productIds = dto.orderItems.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p.price]));

      let subtotal = 0;
      let totalQuantity = 0;

      const items = dto.orderItems.map((item) => {
        const dbPrice = productMap.get(item.productId);
        if (dbPrice === undefined) {
          throw new AppError(400, '상품 정보를 찾을 수 없습니다.');
        }

        subtotal += dbPrice * item.quantity;
        totalQuantity += item.quantity;

        return {
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: item.quantity,
          price: dbPrice,
        };
      });

      let order;
      try {
        order = await this.orderRepository.createOrderAndDecreaseStock(tx, {
          userId,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          usePoint: dto.usePoint,
          subtotal,
          totalQuantity,
          items,
        });
      } catch (err) {
        if (err instanceof Error && err.message == 'STOCK_NOT_ENOUGH') {
          throw new AppError(400, '재고가 부족합니다.');
        }
        throw err;
      }
      await this.orderRepository.createOrderItemsAndPayment(tx, order.id, items, subtotal);

      await this.orderRepository.removeOrderedItems(tx, userId, dto.orderItems);

      const createdOrder = await this.orderRepository.findOrderWithRelationForTx(tx, order.id);

      if (!createdOrder) {
        throw new AppError(500, '주문 생성에 실패했습니다.');
      }

      return OrderMapper.toOrderResponseDto(createdOrder);
    });
  }

  async getOrderById(orderId: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOrderWithRelations(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.');
    }
    if (order.buyerId !== userId) {
      throw new AppError(403, '접근 권한이 없습니다.');
    }

    return OrderMapper.toOrderResponseDto(order);
  }

  async deleteOrder(user: AuthUser, orderId: string) {
    const order = await this.orderRepository.findOrderWithRelations(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.');
    }

    if (order.buyerId !== user.id) {
      throw new AppError(403, '접근 권한이 없습니다.');
    }

    if (!order.payment || order.payment.status !== PaymentStatus.WaitingPayment) {
      throw new AppError(400, '결재 대기 상태인 주문만 취소가 가능합니다.');
    }

    await prisma.$transaction(async (tx) => {
      await this.orderRepository.deleteOrder(tx, order);
    });

    return null;
  }

  async updateOrder(
    orderId: string,
    user: AuthUser,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.');
    }

    if (order.buyerId !== user.id) {
      throw new AppError(403, '접근 권한이 없습니다.');
    }

    if (order.payment && order.payment.status !== 'WaitingPayment') {
      throw new AppError(400, '이미 결제가 된 주문은 수정할 수 없습니다.');
    }

    const updatedOrder = await this.orderRepository.updateOrderInfo(orderId, {
      name: dto.name,
      phoneNumber: dto.phone,
      address: dto.address,
    });

    return OrderMapper.toOrderResponseDto(updatedOrder);
  }
}
