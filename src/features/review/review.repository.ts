import prisma from '../../lib/prisma';

export class ReviewRepository {
  async findOrderItem(orderItemId: string) {
    return prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
  }
}
