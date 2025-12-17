import prisma from '../../lib/prisma';
import { AppError } from '../../shared/middleware/error-handler';
import { CreateOrderDto } from './order.dto';
import { PaymentStatus, Prisma, Order, OrderItem } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

interface FindOrdersParams {
  userId: string;
  skip: number;
  take: number;
  status?: string;
}

export class OrderRepository {
  async findOrders(params: FindOrdersParams) {
    const { userId, skip, take, status } = params;

    return prisma.order.findMany({
      where: {
        buyerId: userId,
        ...(status && {
          payments: {
            status,
          },
        }),
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                store: true,
                stocks: {
                  include: {
                    size: true,
                  },
                },
              },
            },
            size: true,
          },
        },
        payment: true,
      },
    });
  }

  async countOrders(params: { userId: string; status?: string }) {
    const { userId, status } = params;

    return prisma.order.count({
      where: {
        buyerId: userId,
        ...(status && {
          payments: {
            status,
          },
        }),
      },
    });
  }

  async findOrderWithRelations(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
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
  }

  async deleteOrder(tx: Prisma.TransactionClient, order: Order & { orderItems: OrderItem[] }) {
    for (const item of order.orderItems) {
      if (!item.productId) continue;

      await tx.stock.updateMany({
        where: {
          productId: item.productId,
          sizeId: item.sizeId,
        },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
    await tx.order.delete({
      where: { id: order.id },
    });
  }

  async updateOrder(
    db: DbClient,
    orderId: string,
    data: {
      name?: string;
      phoneNumber?: string;
      address?: string;
    },
  ) {
    return db.order.update({
      where: { id: orderId },
      data,
    });
  }

  async createOrderWithTransaction(userId: string, dto: CreateOrderDto) {
    const { name, phone, address, usePoint } = dto;

    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { buyerId: userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  store: true,
                  stocks: { include: { size: true } },
                },
              },
              size: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError(400, '장바구니가 비어 있습니다.');
      }

      let subtotal = 0;
      let totalQuantity = 0;

      for (const item of cart.items) {
        if (!item.product) {
          throw new AppError(400, '상품 정보가 유효하지 않습니다.');
        }

        subtotal += item.product.price * item.quantity;
        totalQuantity += item.quantity;
      }

      const order = await tx.order.create({
        data: {
          name,
          phoneNumber: phone,
          address,
          subtotal,
          totalQuantity,
          buyerId: userId,
          usePoint,
        },
      });

      for (const item of cart.items) {
        const updated = await tx.stock.updateMany({
          where: {
            productId: item.productId,
            sizeId: item.sizeId,
            quantity: { gte: item.quantity },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count === 0) {
          throw new AppError(400, '재고가 부족한 상품이 있습니다.');
        }
      }

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          sizeId: item.sizeId,
          price: item.product!.price,
          quantity: item.quantity,
        })),
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          price: subtotal,
          status: PaymentStatus.CompletedPayment,
        },
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      const createdOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  store: true,
                  stocks: { include: { size: true } },
                },
              },
              size: true,
            },
          },
          payment: true,
        },
      });

      if (!createdOrder) {
        throw new AppError(500, '주문 생성에 실패했습니다.');
      }

      return createdOrder;
    });
  }

  async findOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                store: true,
                stocks: { include: { size: true } },
              },
            },
            size: true,
          },
        },
        payment: true,
      },
    });
  }

  async updateOrderInfo(
    orderId: string,
    data: { name?: string; phoneNumber?: string; address?: string },
  ) {
    return prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                store: true,
                stocks: { include: { size: true } },
              },
            },
            size: true,
          },
        },
        payment: true,
      },
    });
  }
}
