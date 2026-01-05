import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { NotificationService } from '../notification/notification.service';
import { GradeService } from '../metadata/grade/grade.service';

export function createOrderController(): OrderController {
  const orderRepository = new OrderRepository();

  const notificationService = new NotificationService();

  const gradeService = new GradeService();

  const orderService = new OrderService(orderRepository, notificationService, gradeService);

  const controller = new OrderController(orderService);

  return controller;
}
