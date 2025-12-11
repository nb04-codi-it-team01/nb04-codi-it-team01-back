import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

export class ReviewRepository {
  async findOrderItem(orderItemId: string) {
    return prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
  }

  async findById(reviewId: string) {
    return prisma.review.findUnique({
      where: { id: reviewId },
    });
  }

  async update(reviewId: string, data: Prisma.ReviewUpdateInput) {
    return prisma.review.update({
      where: { id: reviewId },
      data,
    });
  }

  async delete(reviewId: string, orderItemId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { isReviewed: false },
      });

      return tx.review.delete({
        where: { id: reviewId },
      });
    });
  }
}
