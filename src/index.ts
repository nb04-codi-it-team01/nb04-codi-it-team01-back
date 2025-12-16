import { Router } from 'express';
import authRoute from './features/auth/auth.routes';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import storeRoute from './features/store/store.route';

const apiRouter = Router();

// 개별 라우터를 메인 라우터에 연결
apiRouter.use('/auth', authRoute);
apiRouter.use('/products', productRoute);
apiRouter.use('/users', userRoute);
apiRouter.use('/stores', storeRoute);

export default apiRouter;
