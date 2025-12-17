import { RequestHandler } from 'express';
import { AppError } from '../../shared/middleware/error-handler';
import { CartService } from './cart.service';
import { AddCartItemBody } from './cart.schema';

export class CartController {
  constructor(private readonly cartService = new CartService()) {}

  createCart: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    if (!userType) {
      throw new AppError(403, '요청에 필요한 권한 정보가 누락되었습니다.', 'Forbidden');
    }

    const cart = await this.cartService.createCart(userId, userType);

    res.status(201).json(cart);
  };

  getCart: RequestHandler = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const cart = await this.cartService.getCart(userId);

    res.status(200).json(cart);
  };

  updateCart: RequestHandler = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const body = req.body as AddCartItemBody;

    const cartItems = await this.cartService.updateCart(userId, body);

    res.status(200).json(cartItems);
  };

  deleteCartItem: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    const { cartItemId } = req.params as { cartItemId: string };

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    await this.cartService.deleteCartItem(userId, cartItemId);

    return res.status(204).send();
  };
}
