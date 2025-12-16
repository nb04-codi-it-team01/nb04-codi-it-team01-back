import { Router } from 'express';
import { CartController } from './cart.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const cartController = new CartController();

router.post('/cart', accessTokenAuth, cartController.createCart);
router.get('/cart', accessTokenAuth, cartController.getCart);

export default router;
