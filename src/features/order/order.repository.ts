import prisma from '../../lib/prisma';
import { AppError } from '../../shared/middleware/error-handler';
import { CreateOrderDto } from './order.dto';
import { OrderWithRelations } from './order.type';
import { Prisma } from '@prisma/client';

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

  // async findCartByUserId(userId: string) {
  //   return prisma.cart.findUnique({ where: { buyerId: userId } });
  // }

  async findOrderWithRelations(orderId: string): Promise<OrderWithRelations | null> {
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

  async deleteOrder(tx: Prisma.TransactionClient, orderId: string) {
    await tx.order.delete({
      where: { id: orderId },
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

  // async findByBuyerId(buyerId: string) {
  //   return prisma.cart.findUnique({
  //     where: { buyerId },
  //     include: {
  //       items: {
  //         include: {
  //           product: {
  //             include: {
  //               store: true,
  //               stocks: { include: { size: true } },
  //             },
  //           },
  //           size: true,
  //         },
  //       },
  //     },
  //   });
  // }

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

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          sizeId: item.sizeId,
          price: item.product!.price,
          quantity: item.quantity,
        })),
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
