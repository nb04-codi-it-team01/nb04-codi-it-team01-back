import prisma from '../../lib/prisma';
import { Prisma, Order, OrderItem, Payment, PaymentStatus } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

interface FindOrdersParams {
  userId: string;
  skip: number;
  take: number;
  status?: string;
  reviewType?: 'available' | 'completed';
}

interface OrderAndStockResult {
  order: Order;
  soldOutProductIds: { productId: string; sizeId: number }[];
}

export class OrderRepository {
  async findOrders(params: FindOrdersParams) {
    const { userId, skip, take, status, reviewType } = params;

    const itemFilter: Prisma.OrderItemWhereInput = {};

    if (reviewType === 'available') {
      itemFilter.isReviewed = false;
      itemFilter.productId = { not: null };
    } else if (reviewType === 'completed') {
      itemFilter.isReviewed = true;
      itemFilter.productId = { not: null };
    }

    const orderWhereInput: Prisma.OrderWhereInput = {
      buyerId: userId,
      payment: {
        status: status ? (status as PaymentStatus) : { in: ['CompletedPayment', 'WaitingPayment'] },
      },
    };

    if (reviewType) {
      orderWhereInput.orderItems = { some: itemFilter };
    }

    return prisma.order.findMany({
      where: orderWhereInput,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        orderItems: {
          where: itemFilter,
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
            review: true,
          },
        },
        payment: true,
      },
    });
  }

  async countOrders(params: {
    userId: string;
    status?: string;
    reviewType?: 'available' | 'completed';
  }) {
    const { userId, status, reviewType } = params;

    const itemFilter: Prisma.OrderItemWhereInput = {};
    if (reviewType === 'available') {
      itemFilter.isReviewed = false;
      itemFilter.productId = { not: null };
    } else if (reviewType === 'completed') {
      itemFilter.isReviewed = true;
      itemFilter.productId = { not: null };
    }

    const whereInput: Prisma.OrderWhereInput = {
      buyerId: userId,
      ...(status && {
        payment: {
          status: 'CompletedPayment',
        },
      }),
    };

    if (reviewType) {
      whereInput.orderItems = { some: itemFilter };
    }

    return prisma.order.count({
      where: whereInput,
    });
  }

  async findOrderWithRelations(orderId: string) {
    return prisma.order.findUnique({
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
  }

  async findGradeByUserId(tx: Prisma.TransactionClient, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        grade: {
          select: {
            rate: true,
          },
        },
      },
    });

    return user?.grade?.rate ?? 0;
  }

  async incrementPoints(tx: Prisma.TransactionClient, userId: string, points: number) {
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: points } },
    });
  }

  async incrementAmount(tx: Prisma.TransactionClient, userId: string, amount: number) {
    const user = await tx.user.update({
      where: { id: userId },
      data: { totalAmount: { increment: amount } },
      select: { totalAmount: true, gradeId: true },
    });

    return {
      totalAmount: user.totalAmount,
      gradeId: user.gradeId!,
    };
  }

  async updateGradeByUserId(tx: Prisma.TransactionClient, userId: string, gradeId: string) {
    await tx.user.update({
      where: { id: userId },
      data: { gradeId: gradeId },
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
  ): Promise<OrderAndStockResult> {
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

    const soldOutProductIds: { productId: string; sizeId: number }[] = [];
    const checkedProducts = new Set<string>();

    for (const item of input.items) {
      const updateResult = await tx.stock.updateMany({
        where: {
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      if (updateResult.count === 0) {
        throw new Error('STOCK_NOT_ENOUGH');
      }

      await tx.product.update({
        where: { id: item.productId },

        data: {
          salesCount: {
            increment: item.quantity,
          },
        },
      });

      const currentStock = await tx.stock.findUnique({
        where: {
          productId_sizeId: { productId: item.productId, sizeId: item.sizeId },
        },
      });

      if (currentStock && currentStock.quantity === 0) {
        soldOutProductIds.push({
          productId: item.productId,
          sizeId: item.sizeId,
        });
      }

      if (!checkedProducts.has(item.productId)) {
        const allStocks = await tx.stock.findMany({
          where: { productId: item.productId },
        });

        const totalQuantity = allStocks.reduce((sum, s) => sum + s.quantity, 0);

        if (totalQuantity === 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { isSoldOut: true },
          });
        }
        checkedProducts.add(item.productId);
      }
    }

    return { order, soldOutProductIds };
  }

  async createOrderItemsAndPayment(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: {
      productId: string;
      sizeId: number;
      quantity: number;
      price: number;
      name: string;
      image: string | null;
      storeId: string;
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
        productName: item.name,
        productImage: item.image,
        storeId: item.storeId,
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

  async removeOrderedItems(
    tx: Prisma.TransactionClient,
    userId: string,
    items: { productId: string; sizeId: number }[],
  ) {
    await tx.cartItem.deleteMany({
      where: {
        cart: { buyerId: userId },
        OR: items.map((item) => ({
          productId: item.productId,
          sizeId: item.sizeId,
        })),
      },
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
            review: true,
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
            review: true,
            product: {
              include: {
                store: true,
                reviews: true,
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
