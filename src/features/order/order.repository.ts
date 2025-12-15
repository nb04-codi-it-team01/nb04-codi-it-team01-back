import prisma from '../../lib/prisma';
import { OrderWithRelations } from './order.type';
import { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

export class OrderRepository {
  async findCartByUserId(userId: string) {
    return prisma.cart.findUnique({ where: { buyerId: userId } });
  }

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
}
