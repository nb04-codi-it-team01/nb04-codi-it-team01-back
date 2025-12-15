import { Router } from 'express';
import { OrderController } from './order.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const controller = new OrderController();

router.get('./orders', accessTokenAuth, controller.getCart);
router.post('./orders', accessTokenAuth, controller.createOrder);
router.get('./orders/:orderId', accessTokenAuth, controller.getOrder);
router.delete('./orders/:orderId', accessTokenAuth, controller.deleteOrder);
router.patch('./orders/:orderId', accessTokenAuth, controller.updateOrder);

export default router;
