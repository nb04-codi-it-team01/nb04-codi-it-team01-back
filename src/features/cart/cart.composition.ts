import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

export function createCartController(): CartController {
  const cartRepository = new CartRepository();

  const cartService = new CartService(cartRepository);

  const controller = new CartController(cartService);

  return controller;
}
