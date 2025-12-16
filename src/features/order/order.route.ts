import { Router } from 'express';
import { OrderController } from './order.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const controller = new OrderController();

router.get('/orders', accessTokenAuth, controller.getOrder);
router.post('/orders', accessTokenAuth, controller.createOrder);
router.get('/orders/:orderId', accessTokenAuth, controller.getOrderDetail);
router.delete('/orders/:orderId', accessTokenAuth, controller.deleteOrder);
router.patch('/orders/:orderId', accessTokenAuth, controller.updateOrder);

export default router;

// 기능 테스트를 위한 mock 우회 코드
// import { Router } from 'express';
// import { OrderController } from './order.controller';
// import { mockAuth } from '../../shared/middleware/mockAuth';

// const router = Router();
// const controller = new OrderController();

// router.get('/orders', mockAuth, controller.getCart);
// router.post('/orders', mockAuth, controller.createOrder);
// router.get('/orders/:orderId', mockAuth, controller.getOrder);
// router.delete('/orders/:orderId', mockAuth, controller.deleteOrder);
// router.patch('/orders/:orderId', mockAuth, controller.updateOrder);

// export default router;
