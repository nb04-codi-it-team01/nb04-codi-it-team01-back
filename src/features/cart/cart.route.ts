import { Router } from 'express';
import { CartController } from './cart.controller';
import { accessTokenAuth } from '../../lib/passport';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { cartItemSchema, cartIdParamSchema } from './cart.schema';

const router = Router();
const cartController = new CartController();

router.post('/cart', accessTokenAuth, cartController.createCart);
router.get('/cart', accessTokenAuth, cartController.getCart);
router.patch('/cart', validateBody(cartItemSchema), accessTokenAuth, cartController.updateCart);
router.delete(
  '/cart/:cartItemId',
  validateParams(cartIdParamSchema),
  accessTokenAuth,
  cartController.deleteCartItem,
);
router.get(
  '/cart/:cartItemId',
  validateParams(cartIdParamSchema),
  accessTokenAuth,
  cartController.getCartItem,
);

export default router;
