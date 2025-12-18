import prisma from '../../lib/prisma';
import { Prisma, Order, OrderItem, Payment, PaymentStatus } from '@prisma/client';

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
        payment: {
          status: status
            ? (status as PaymentStatus)
            : { in: ['CompletedPayment', 'WaitingPayment'] },
        },
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
            status: 'CompletedPayment',
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

  async deleteOrder(
    tx: Prisma.TransactionClient,
    order: Order & { orderItems: OrderItem[]; payment: Payment | null },
  ) {
    for (const item of order.orderItems) {
      if (!item.productId) continue;

      await tx.stock.update({
        where: {
          productId_sizeId: {
            productId: item.productId,
            sizeId: item.sizeId,
          },
        },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'CancelledPayment',
        },
      });
    }
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

  async findCartWithItems(tx: Prisma.TransactionClient, userId: string) {
    return tx.cart.findUnique({
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
  }

  async createOrderAndDecreaseStock(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      name: string;
      phone: string;
      address: string;
      usePoint: number;
      subtotal: number;
      totalQuantity: number;
      items: {
        productId: string;
        sizeId: number;
        quantity: number;
      }[];
    },
  ) {
    const order = await tx.order.create({
      data: {
        buyerId: input.userId,
        name: input.name,
        phoneNumber: input.phone,
        address: input.address,
        subtotal: input.subtotal,
        totalQuantity: input.totalQuantity,
        usePoint: input.usePoint,
      },
    });

    for (const item of input.items) {
      const result = await tx.stock.updateMany({
        where: {
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      if (result.count === 0) {
        throw new Error('STOCK_NOT_ENOUGH');
      }
    }

    return order;
  }

  async createOrderItemsAndPayment(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: {
      productId: string;
      sizeId: number;
      quantity: number;
      price: number;
    }[],
    subtotal: number,
  ) {
    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId,
        productId: item.productId,
        sizeId: item.sizeId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    await tx.payment.create({
      data: {
        orderId,
        price: subtotal,
        status: 'CompletedPayment',
      },
    });
  }

  async clearCart(tx: Prisma.TransactionClient, cartId: string) {
    await tx.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async findOrderWithRelationForTx(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUnique({
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
