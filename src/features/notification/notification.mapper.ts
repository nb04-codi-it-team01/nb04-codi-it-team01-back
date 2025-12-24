import { Notification } from '@prisma/client';
import { NotificationDto, NotificationListDto } from './notification.dto';

export class NotificationMapper {
  static toNOtification(notifications: Notification[]): NotificationDto[] {
    return notifications.map(({ isSent, ...rest }) => rest);
  }

  static toNotificationList(
    notifications: Notification[],
    totalCount: number,
  ): NotificationListDto {
    return {
      list: notifications.map(({ isSent, ...rest }) => rest),
      totalCount,
    };
  }
}
