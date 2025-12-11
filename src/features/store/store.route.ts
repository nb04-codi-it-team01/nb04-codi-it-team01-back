import { Router } from 'express';
import { StoreController } from './store.controller';

const router = Router();
const storeController = new StoreController();

router.post('/stores', storeController.create);
router.patch('/stores/:storeId', storeController.update);
router.get('/stores/:storeId', storeController.getStoreDetail);
router.get('/stores/detail/my', storeController.getMyStoreDetail);
router.post('/stores/:storeId/favorite', storeController.userLikeRegister);
router.delete('/stores/:storeId/favorite', storeController.userLikeUnregister);

export default router;
