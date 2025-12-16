import { Router } from 'express';
import { StoreController } from './store.controller';
import { accessTokenAuth } from '../../lib/passport';

const router = Router();
const storeController = new StoreController();

router.post('/stores', accessTokenAuth, storeController.create);
router.patch('/stores/:storeId', accessTokenAuth, storeController.update);
router.get('/stores/:storeId', storeController.getStoreDetail);
router.get('/stores/detail/my', accessTokenAuth, storeController.getMyStoreDetail);
router.get('/stores/detail/my/product', accessTokenAuth, storeController.getMyProducts);
router.post('/stores/:storeId/favorite', accessTokenAuth, storeController.userLikeRegister);
router.delete('/stores/:storeId/favorite', accessTokenAuth, storeController.userLikeUnregister);

export default router;
