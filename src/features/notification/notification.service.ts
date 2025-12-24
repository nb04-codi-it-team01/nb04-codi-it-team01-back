import { NotificationMapper } from './notification.mapper';
import { NotificationRepository } from './notification.repository';

export class NotificationService {
  constructor(private readonly notificationRepository = new NotificationRepository()) {}

  async createSoldOutNotification(items: { productId: string; sizeId: number }[]) {
    for (const item of items) {
      const product = await this.notificationRepository.findProduct(item.productId, item.sizeId);

      if (!product || !product.store || !product.store.userId || !product.stocks[0]) {
        console.error('알람 생성 실패');
        continue;
      }

      const sellerId = product.store.userId;
      const buyerIds = await this.notificationRepository.findUsersWithProductInCart(
        item.productId,
        item.sizeId,
      );
      const buyerIdList = buyerIds.map((item) => item.cart.buyerId);

      const targetIds = [...new Set([sellerId, ...buyerIdList])];

      const content = `${product.name} 상품의 ${product.stocks[0].size.ko} 사이즈가 품절 되었습니다.`;
      await this.notificationRepository.createSoldOutNotifications(targetIds, content);
    }
  }

  async getNewNotifications(userId: string) {
    // 새 알림 가져오기
    const notifications = await this.notificationRepository.findUnsent(userId);

    if (notifications.length > 0) {
      // 가져오자마자 전송됨(isSent: true)으로 표시
      await this.notificationRepository.markAsSent(notifications.map((n) => n.id));
    }

    return NotificationMapper.toNOtification(notifications);
  }

  async getNotifications(userId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [notifications, totalCount] = await Promise.all([
      this.notificationRepository.findNotifications(userId, skip, take),
      this.notificationRepository.countUnchecked(userId),
    ]);

    return NotificationMapper.toNotificationList(notifications, totalCount);
  }
}
