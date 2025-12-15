import type { RequestHandler } from 'express';
import { OrderService } from './order.service';
import { AppError } from '../../shared/middleware/error-handler';

export class OrderController {
  constructor(private readonly orderService = new OrderService()) {}

  getCart: RequestHandler = async (req, res, next) => {
    try {
      const user = req.user;
      const userType = req.user?.type;
      if (!user) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }
      if (!userType) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      const cartItems = await this.orderService.getCart(user.id);
      return res.status(200).json({
        message: '장바구니 조회 성공',
        data: cartItems,
      });
    } catch (err) {
      next(err);
    }
  };

  createOrder: RequestHandler = async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      const order = await this.orderService.createOrder(user.id, req.body);

      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  };

  getOrder: RequestHandler = async (req, res, next) => {
    try {
      const user = req.user;
      const { orderId } = req.params;

      if (!user) {
        throw new AppError(401, '인증이 필요합니다.', 'Uanuthorized');
      }

      if (!orderId) {
        throw new AppError(400, '잘못된 요청입니다.', 'Bad Request');
      }

      const order = await this.orderService.getOrderById(orderId, user);

      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  };

  deleteOrder: RequestHandler = async (req, res, next) => {
    try {
      const user = req.user;
      const { orderId } = req.params;

      if (!user) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!orderId) {
        throw new AppError(400, '잘못된 요청입니다.', 'Bad Request');
      }

      await this.orderService.deleteOrder(user, orderId);

      return res.status(200).json(null);
    } catch (err) {
      next(err);
    }
  };

  updateOrder: RequestHandler = async (req, res, next) => {
    try {
      const user = req.user;
      const { orderId } = req.params;

      if (!user) {
        throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
      }

      if (!orderId) {
        throw new AppError(400, '잘못된 요청입니다.', 'Bad Request');
      }

      const result = await this.orderService.updateOrder(user, orderId, req.body);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
