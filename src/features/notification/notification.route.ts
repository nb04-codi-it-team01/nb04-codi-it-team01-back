import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { validateParams, validateQuery } from '../../shared/middleware/validate';
import { alarmIdParamSchema, getNotificationsQuerySchema } from './notification.schema';

const router = Router();
const notificationController = new NotificationController();

router.get('/notifications/sse', accessTokenAuth, notificationController.stream);
router.get(
  '/notifications',
  accessTokenAuth,
  validateQuery(getNotificationsQuerySchema),
  notificationController.getNotifications,
);
router.patch(
  '/notifications/:alarmId/check',
  accessTokenAuth,
  validateParams(alarmIdParamSchema),
  notificationController.markAsRead,
);

export default router;
