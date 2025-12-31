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
import { NotificationService } from '../notification/notification.service';
import { GradeService } from '../metadata/grade/grade.service';

interface GetOrdersParams {
  userId: string;
  page: number;
  limit: number;
  status?: string;
  reviewType?: 'available' | 'completed';
}

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly notificationService: NotificationService,
    private readonly gradeService: GradeService,
  ) {}

  async getOrders(params: GetOrdersParams): Promise<OrderPaginatedResponseDto> {
    const { userId, page, limit, status, reviewType } = params;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderRepository.findOrders({
        userId,
        skip,
        take: limit,
        status,
        reviewType,
      }),
      this.orderRepository.countOrders({
        userId,
        status,
        reviewType,
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
    let soldOutItems: { productId: string; sizeId: number }[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const productIds = dto.orderItems.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true, name: true, image: true, storeId: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let totalQuantity = 0;

      const items = dto.orderItems.map((item) => {
        const product = productMap.get(item.productId);
        if (product === undefined) {
          throw new AppError(400, '상품 정보를 찾을 수 없습니다.');
        }

        if (!product.storeId) {
          throw new AppError(400, '상점의 정보가 존재하지 않습니다.');
        }

        subtotal += product.price * item.quantity;
        totalQuantity += item.quantity;

        return {
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
          image: product.image,
          storeId: product.storeId,
        };
      });

      try {
        const { order, soldOutProductIds } = await this.orderRepository.createOrderAndDecreaseStock(
          tx,
          {
            userId,
            name: dto.name,
            phone: dto.phone,
            address: dto.address,
            usePoint: dto.usePoint,
            subtotal,
            totalQuantity,
            items,
          },
        );

        if (dto.usePoint > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { points: { decrement: dto.usePoint } },
          });
        }

        const rate = await this.orderRepository.findGradeByUserId(tx, userId);

        const earnedPoints = Math.floor(subtotal * (rate / 100));

        await this.orderRepository.incrementPoints(tx, userId, earnedPoints);

        const updatedUser = await this.orderRepository.incrementAmount(tx, userId, subtotal);

        await this.gradeService.syncUserGrade(
          tx,
          userId,
          updatedUser.totalAmount,
          updatedUser.gradeId,
        );

        soldOutItems = soldOutProductIds;

        await this.orderRepository.createOrderItemsAndPayment(tx, order.id, items, subtotal);

        await this.orderRepository.removeOrderedItems(tx, userId, dto.orderItems);

        const createdOrder = await this.orderRepository.findOrderWithRelationForTx(tx, order.id);

        if (!createdOrder) {
          throw new AppError(500, '주문 생성에 실패했습니다.');
        }

        return OrderMapper.toOrderResponseDto(createdOrder);
      } catch (err) {
        if (err instanceof Error && err.message === 'STOCK_NOT_ENOUGH') {
          throw new AppError(400, '재고가 부족한 상품이 있습니다.');
        }
        throw err;
      }
    });

    if (soldOutItems.length > 0) {
      await this.notificationService.createSoldOutNotification(soldOutItems);
    }

    return result;
  }

  async getOrderById(orderId: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.getOrderAndVerifyOwner(orderId, userId);

    return OrderMapper.toOrderResponseDto(order);
  }

  async deleteOrder(user: AuthUser, orderId: string) {
    const order = await this.getOrderAndVerifyOwner(orderId, user.id);
    this.verifyOrderModifiable(order);

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
    const order = await this.getOrderAndVerifyOwner(orderId, user.id);
    this.verifyOrderModifiable(order);

    const updatedOrder = await this.orderRepository.updateOrderInfo(orderId, {
      name: dto.name,
      phoneNumber: dto.phone,
      address: dto.address,
    });

    return OrderMapper.toOrderResponseDto(updatedOrder);
  }

  private async getOrderAndVerifyOwner(orderId: string, userId: string) {
    const order = await this.orderRepository.findOrderWithRelations(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.');
    }
    if (order.buyerId !== userId) {
      throw new AppError(403, '접근 권한이 없습니다.');
    }

    return order;
  }

  private async verifyOrderModifiable(order: { payment?: { status: PaymentStatus } | null }) {
    if (!order.payment || order.payment.status !== PaymentStatus.WaitingPayment) {
      throw new AppError(400, '결재 대기 상태인 주문만 수정/취소가 가능합니다.');
    }
  }
}
