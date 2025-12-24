import { Router } from 'express';
import { StoreController } from './store.controller';
import { accessTokenAuth } from '../../lib/passport';
import { mapImageToBody, upload } from '../../shared/middleware/upload-handler';

const router = Router();
const storeController = new StoreController();

router.post(
  '/stores',
  upload.single('image'),
  mapImageToBody('image'),
  accessTokenAuth,
  storeController.create,
);
router.patch(
  '/stores/:storeId',
  upload.single('image'),
  mapImageToBody('image'),
  accessTokenAuth,
  storeController.update,
);
router.get('/stores/:storeId', storeController.getStoreDetail);
router.get('/stores/detail/my', accessTokenAuth, storeController.getMyStoreDetail);
router.get('/stores/detail/my/product', accessTokenAuth, storeController.getMyProducts);
router.post('/stores/:storeId/favorite', accessTokenAuth, storeController.userLikeRegister);
router.delete('/stores/:storeId/favorite', accessTokenAuth, storeController.userLikeUnregister);

export default router;
