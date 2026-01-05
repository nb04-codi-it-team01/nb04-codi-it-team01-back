import { RequestHandler } from 'express';
import { CartService } from './cart.service';
import { CartItemBody, CartItemIdParamSchema } from './cart.schema';

export class CartController {
  constructor(private readonly cartService: CartService) {}

  createCart: RequestHandler = async (req, res) => {
    const cart = await this.cartService.createCart(req.user!.id);

    res.status(201).json(cart);
  };

  getCart: RequestHandler = async (req, res) => {
    const cart = await this.cartService.getCart(req.user!.id);

    res.status(200).json(cart);
  };

  updateCart: RequestHandler = async (req, res) => {
    const body = req.body as CartItemBody;

    const cartItems = await this.cartService.updateCart(req.user!.id, body);

    res.status(200).json(cartItems);
  };

  deleteCartItem: RequestHandler = async (req, res) => {
    const { cartItemId } = req.params as CartItemIdParamSchema;

    await this.cartService.deleteCartItem(req.user!.id, cartItemId);

    return res.status(204).send();
  };

  getCartItem: RequestHandler = async (req, res) => {
    const { cartItemId } = req.params as CartItemIdParamSchema;

    const cartItem = await this.cartService.getCartItem(req.user!.id, cartItemId);

    return res.status(200).json(cartItem);
  };
}
