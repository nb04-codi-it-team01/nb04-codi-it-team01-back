import { Router } from 'express';
import authRoute from './features/auth/auth.routes';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import storeRoute from './features/store/store.route';
import reviewRoute from './features/review/review.route';
import cartRoute from './features/cart/cart.route';

const apiRouter = Router();

// 개별 라우터를 메인 라우터에 연결
apiRouter.use('/', authRoute);
apiRouter.use('/', productRoute);
apiRouter.use('/', userRoute);
apiRouter.use('/', storeRoute);
apiRouter.use('/', reviewRoute);
apiRouter.use('/', cartRoute);

export default apiRouter;
