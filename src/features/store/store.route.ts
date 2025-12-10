import { Router } from 'express';
import { StoreController } from './store.controller';

const router = Router();
const storeController = new StoreController();

router.post('/stores', storeController.create);
router.get('/stores/:storeId', storeController.getStoreDetail);
router.get('/stores/detail/my', storeController.getMyStoreDetail);

export default router;
