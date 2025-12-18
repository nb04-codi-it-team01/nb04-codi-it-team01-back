import { RequestHandler } from 'express';
import { AppError } from '../../shared/middleware/error-handler';
import { CartService } from './cart.service';
import { CartItemBody } from './cart.schema';

export class CartController {
  constructor(private readonly cartService = new CartService()) {}

  createCart: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const cart = await this.cartService.createCart(userId);

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

    const body = req.body as CartItemBody;

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

  getCartItem: RequestHandler = async (req, res) => {
    const userId = req.user?.id;

    const { cartItemId } = req.params as { cartItemId: string };

    if (!userId) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const cartItem = await this.cartService.getCartItem(userId, cartItemId);

    return res.status(200).json(cartItem);
  };
}
