import { Router } from 'express';
import { CartController } from './cart.controller';
import { accessTokenAuth } from '../../lib/passport';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { cartItemSchema, cartIdParamSchema } from './cart.schema';
import { requireUserType } from '../../shared/middleware/require-user-type';

const router = Router();
const cartController = new CartController();

router.post('/cart', accessTokenAuth, requireUserType('BUYER'), cartController.createCart);
router.get('/cart', accessTokenAuth, requireUserType('BUYER'), cartController.getCart);
router.patch(
  '/cart',
  validateBody(cartItemSchema),
  accessTokenAuth,
  requireUserType('BUYER'),
  cartController.updateCart,
);
router.delete(
  '/cart/:cartItemId',
  validateParams(cartIdParamSchema),
  accessTokenAuth,
  requireUserType('BUYER'),
  cartController.deleteCartItem,
);
router.get(
  '/cart/:cartItemId',
  validateParams(cartIdParamSchema),
  accessTokenAuth,
  requireUserType('BUYER'),
  cartController.getCartItem,
);

export default router;
