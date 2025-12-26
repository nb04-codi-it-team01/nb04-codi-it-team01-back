import prisma from '../../lib/prisma';

export class NotificationRepository {
  async findProduct(productId: string, sizeId: number) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
        stocks: {
          where: { sizeId },
          include: { size: true },
        },
      },
    });
  }

  async findUsersWithProductInCart(productId: string, sizeId: number) {
    return prisma.cartItem.findMany({
      where: {
        productId,
        sizeId,
      },
      select: {
        cart: {
          select: {
            buyerId: true,
          },
        },
      },
    });
  }

  async createSoldOutNotifications(userIds: string[], content: string) {
    await prisma.notification.createMany({
      data: userIds.map((id) => ({
        userId: id,
        content,
      })),
    });
  }

  async createNotification(userId: string, content: string) {
    await prisma.notification.create({
      data: {
        userId,
        content,
      },
    });
  }

  // 1. 아직 전송되지 않은 알림만 조회
  async findUnsent(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        isSent: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. 전송 완료 후 상태 업데이트
  async markAsSent(ids: string[]) {
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isSent: true },
    });
  }

  async findNotifications(userId: string, skip: number, take: number) {
    return prisma.notification.findMany({
      where: {
        userId,
        isChecked: false,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countUnchecked(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isChecked: false,
      },
    });
  }

  async findByAlarmId(alarmId: string) {
    return prisma.notification.findUnique({
      where: { id: alarmId },
    });
  }

  async update(alarmId: string) {
    return prisma.notification.update({
      where: {
        id: alarmId,
      },
      data: {
        isChecked: true,
      },
    });
  }
}
