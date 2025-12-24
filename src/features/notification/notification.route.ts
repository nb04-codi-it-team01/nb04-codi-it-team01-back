import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { accessTokenAuth } from '../../lib/passport';
import { validateQuery } from '../../shared/middleware/validate';
import { getNotificationsQuerySchema } from './notification.schema';

const router = Router();
const notificationController = new NotificationController();

router.get('/notifications/sse', accessTokenAuth, notificationController.stream);
router.get(
  '/notifications',
  accessTokenAuth,
  validateQuery(getNotificationsQuerySchema),
  notificationController.getNotifications,
);

export default router;
