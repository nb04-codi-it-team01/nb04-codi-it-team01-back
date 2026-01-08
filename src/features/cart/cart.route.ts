import { Router } from 'express';
import { createCartController } from './cart.composition';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { cartItemSchema, cartIdParamSchema } from './cart.schema';
import { requireUserType } from '../../shared/middleware/require-user-type';

const router = Router();
const cartController = createCartController();

router.post('/cart', accessTokenAuth, requireUserType('BUYER'), cartController.createCart);
router.get('/cart', accessTokenAuth, requireUserType('BUYER'), cartController.getCart);
router.patch(
  '/cart',
  accessTokenAuth,
  requireUserType('BUYER'),
  validateBody(cartItemSchema),
  cartController.updateCart,
);
router.delete(
  '/cart/:cartItemId',
  accessTokenAuth,
  requireUserType('BUYER'),
  validateParams(cartIdParamSchema),
  cartController.deleteCartItem,
);
router.get(
  '/cart/:cartItemId',
  accessTokenAuth,
  requireUserType('BUYER'),
  validateParams(cartIdParamSchema),
  cartController.getCartItem,
);

export default router;
