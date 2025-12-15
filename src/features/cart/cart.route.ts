import { Router } from 'express';
import { CartController } from './cart.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const cartController = new CartController();

router.post('/cart', accessTokenAuth, cartController.createCart);

export default router;
