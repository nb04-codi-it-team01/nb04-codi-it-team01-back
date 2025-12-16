import type { RequestHandler } from 'express';
import { OrderService } from './order.service';
import { AppError } from '../../shared/middleware/error-handler';
import { CreateOrderDto, UpdateOrderDto } from './order.dto';

export class OrderController {
  constructor(private readonly orderService = new OrderService()) {}

  getOrder: RequestHandler = async (req, res) => {
    const user = req.user;
    const userId = req.user?.id;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.');
    }
    if (!userId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const status = req.query.status as string | undefined;

    const result = await this.orderService.getOrders({
      userId,
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
    });

    res.status(200).json(result);
  };

  createOrder: RequestHandler = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    const dto: CreateOrderDto = {
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      orderItems: req.body.orderItems,
      usePoint: req.body.usePoint ?? 0,
    };

    const order = await this.orderService.createOrder(userId, dto);

    res.status(201).json(order);
  };

  getOrderDetail: RequestHandler = async (req, res) => {
    const user = req.user;
    const userId = user?.id;
    const { orderId } = req.params;

    if (!user) {
      throw new AppError(401, '인증이 필요합니다.');
    }

    if (!userId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    if (!orderId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    const order = await this.orderService.getOrderById(orderId, userId);
    res.status(200).json(order);
  };

  deleteOrder: RequestHandler = async (req, res) => {
    const user = req.user;
    const userId = user?.id;
    const { orderId } = req.params;

    if (!user) {
      throw new AppError(401, '인증이 필요합니다.');
    }

    if (!userId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    if (!orderId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    await this.orderService.deleteOrder(user, orderId);

    return res.status(200).json(null);
  };

  updateOrder: RequestHandler = async (req, res) => {
    const user = req.user;
    const userId = user?.id;
    const { orderId } = req.params;
    const dto = req.body as UpdateOrderDto;

    if (!user) {
      throw new AppError(401, '인증이 필요합니다.');
    }

    if (!userId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    if (!orderId) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    if (!dto.name || !dto.phone || !dto.address) {
      throw new AppError(400, '잘못된 요청입니다.');
    }

    const result = await this.orderService.updateOrder(orderId, user, dto);

    res.status(200).json(result);
  };
}
