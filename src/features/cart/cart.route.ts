import { Router } from 'express';
import { CartController } from './cart.controller';
import { accessTokenAuth } from '../../lib/passport';
import { validateParams } from '../../shared/middleware/validate';
import { cartIdParamSchema } from './cart.schema';

const router = Router();
const cartController = new CartController();

router.post('/cart', accessTokenAuth, cartController.createCart);
router.get('/cart', accessTokenAuth, cartController.getCart);
router.patch('/cart', accessTokenAuth, cartController.updateCart);
router.delete(
  '/cart/:cartItemId',
  validateParams(cartIdParamSchema),
  accessTokenAuth,
  cartController.deleteCartItem,
);

export default router;
