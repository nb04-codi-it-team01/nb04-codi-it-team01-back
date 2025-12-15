import { OrderRepository } from './order.repository';
import { OrderMapper } from './order.mapper';
import type { OrderItemDto, CreateOrderDto, UpdateOrderDto } from './order.dto';
import { AppError } from '../../shared/middleware/error-handler';
import prisma from '../../lib/prisma';
import type { AuthUser } from '../../shared/types/auth';
import { PaymentStatus } from '@prisma/client';

export class OrderService {
  constructor(private readonly orderRepository = new OrderRepository()) {}

  async getCart(userId: string): Promise<OrderItemDto[]> {
    const cart = await this.orderRepository.findCartByUserId(userId);

    if (!cart) {
      throw new AppError(404, '장바구니를 찾을 수 없습니다.');
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            store: true,
            stocks: { include: { size: true } },
          },
        },
        size: true,
      },
    });

    return OrderMapper.toCartItemList(cartItems);
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    return prisma.$transaction(async (tx) => {
      const { name, phone, address, orderItems, usePoint } = dto;

      if (!orderItems) {
        throw new AppError(400, '주문 상품이 없습니다.');
      }

      let subtotal = 0;
      let totalQuantity = 0;

      const validatedItems = [];

      for (const item of orderItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            store: true,
            stocks: {
              include: { size: true },
            },
          },
        });

        if (!product) {
          throw new AppError(400, '존재하지 않는 상품입니다.');
        }

        const stock = product.stocks.find((s) => s.sizeId === item.sizeId);

        if (!stock || stock.quantity < item.quantity) {
          throw new AppError(400, '재고가 부족합니다.');
        }

        subtotal += product.price * item.quantity;
        totalQuantity += item.quantity;

        validatedItems.push({ product, stock, item });
      }

      const order = await tx.order.create({
        data: {
          buyerId: userId,
          name,
          phoneNumber: phone,
          address,
          subtotal,
          totalQuantity,
          usePoint,
        },
      });

      for (const v of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: v.product.id,
            sizeId: v.item.sizeId,
            price: v.product.price,
            quantity: v.item.quantity,
          },
        });

        await tx.stock.update({
          where: { id: v.stock.id },
          data: {
            quantity: {
              decrement: v.item.quantity,
            },
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          price: subtotal - usePoint,
          status: 'CompletedPayment',
        },
      });

      const fullOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
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

      if (!fullOrder) {
        throw new AppError(500, '주문 조회 실패');
      }

      return OrderMapper.toOrderResponseDto(fullOrder);
    });
  }

  async getOrderById(orderId: string, user: AuthUser) {
    const order = await this.orderRepository.findOrderWithRelations(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.', 'Not Found');
    }

    if (user.type === 'BUYER' && order.buyerId !== user.id) {
      throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
    }

    if (user.type === 'SELLER') {
      const hasMyProduct = order.orderItems.some((item) => item.product?.store?.userId === user.id);

      if (!hasMyProduct) {
        throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
      }
    }
    return OrderMapper.toOrderResponseDto(order);
  }

  async deleteOrder(user: AuthUser, orderId: string) {
    const order = await this.orderRepository.findOrderWithRelations(orderId);

    if (!order) {
      throw new AppError(404, '주문을 찾을 수 없습니다.', 'Not Found');
    }

    if (order.buyerId !== user.id) {
      throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
    }

    if (order.payment?.status !== PaymentStatus.WaitingPayment) {
      throw new AppError(400, '결재 대기 상태인 주문만 취소가 가능합니다.', 'Bad Request');
    }
    await prisma.$transaction(async (tx) => {
      if (order.payment) {
        await this.orderRepository.deleteOrder(tx, order.id);
      }
      await this.orderRepository.deleteOrder(tx, order.id);
    });
  }

  async updateOrder(user: AuthUser, orderId: string, dto: UpdateOrderDto) {
    return prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findOrderWithRelations(orderId);

      if (!order) {
        throw new AppError(404, '주문을 찾을 수 없습니다.', 'Not Found');
      }

      if (order.buyerId !== user.id) {
        throw new AppError(403, '접근 권한이 없습니다.', 'Forbidden');
      }

      if (order.payment?.status !== 'WaitingPayment') {
        throw new AppError(400, '결재 대기 상태에서만 주문을 수정할 수 있습니다.', 'Bad Request');
      }

      await this.orderRepository.updateOrder(tx, orderId, {
        name: dto.name,
        phoneNumber: dto.phone,
        address: dto.address,
      });

      const updatedOrder = await this.orderRepository.findOrderWithRelations(orderId);

      if (!updatedOrder) {
        throw new AppError(500, '주문 수정 후 조회에 실패하였습니다.');
      }

      return OrderMapper.toOrderResponseDto(updatedOrder);
    });
  }
}
