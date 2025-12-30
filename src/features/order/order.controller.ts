import type { RequestHandler } from 'express';
import { OrderService } from './order.service';
import {
  orderIdParamSchema,
  getOrdersQuerySchema,
  createOrderBodySchema,
  updateOrderBodySchema,
} from './order.schema';

export class OrderController {
  constructor(private readonly orderService = new OrderService()) {}

  getOrder: RequestHandler = async (req, res) => {
    const query = getOrdersQuerySchema.parse(req.query);
    const result = await this.orderService.getOrders({
      userId: req.user!.id,
      ...query,
    });
    res.status(200).json(result);
  };

  createOrder: RequestHandler = async (req, res) => {
    const dto = createOrderBodySchema.parse(req.body);
    const order = await this.orderService.createOrder(req.user!.id, dto);
    res.status(201).json(order);
  };

  getOrderDetail: RequestHandler = async (req, res) => {
    const { orderId } = orderIdParamSchema.parse(req.params);
    const order = await this.orderService.getOrderById(orderId, req.user!.id);
    res.status(200).json(order);
  };

  deleteOrder: RequestHandler = async (req, res) => {
    const { orderId } = orderIdParamSchema.parse(req.params);
    await this.orderService.deleteOrder(req.user!, orderId);
    return res.status(200).json(null);
  };

  updateOrder: RequestHandler = async (req, res) => {
    const { orderId } = orderIdParamSchema.parse(req.params);
    const dto = updateOrderBodySchema.parse(req.body);
    const result = await this.orderService.updateOrder(orderId, req.user!, dto);
    res.status(200).json(result);
  };
}
