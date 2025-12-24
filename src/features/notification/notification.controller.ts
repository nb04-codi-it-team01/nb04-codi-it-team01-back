import { RequestHandler } from 'express';
import { NotificationService } from './notification.service';
import { alarmIdParamSchema, getNotificationsQuerySchema } from './notification.schema';

export class NotificationController {
  constructor(private readonly notificationService = new NotificationService()) {}

  stream: RequestHandler = async (req, res) => {
    const user = req.user!;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = async () => {
      const notifications = await this.notificationService.getNewNotifications(user.id);

      res.write(`data: ${JSON.stringify(notifications)}\n\n`);
    };

    await send(); // 첫 연결 시 즉시 실행
    // 20초마다 하트비트를 보내고, 30초마다 데이터를 체크하도록 구성
    const heartbeat = setInterval(async () => {
      res.write(': heartbeat\n\n');
    }, 20000);

    const timer = setInterval(send, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clearInterval(timer);
      res.end();
    });
  };

  getNotifications: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { page, pageSize } = getNotificationsQuerySchema.parse(req.query);

    const notifications = await this.notificationService.getNotifications(user.id, page, pageSize);

    res.status(200).json(notifications);
  };

  markAsRead: RequestHandler = async (req, res) => {
    const user = req.user!;

    const { alarmId } = alarmIdParamSchema.parse(req.params);

    const notification = await this.notificationService.markAsRead(user.id, alarmId);

    res.status(200).json(notification);
  };
}
