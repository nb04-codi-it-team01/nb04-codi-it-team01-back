import { Router } from 'express';
import { createStoreController } from './store.composition';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { mapImageToBody, upload } from '../../shared/middleware/upload-handler';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import {
  createStoreBodySchema,
  getMyProductsQuerySchema,
  storeIdParamSchema,
  updateStoreBodySchema,
} from './store.schema';

const router = Router();
const storeController = createStoreController();

router.post(
  '/stores',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateBody(createStoreBodySchema),
  storeController.create,
);

router.patch(
  '/stores/:storeId',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateParams(storeIdParamSchema),
  validateBody(updateStoreBodySchema),
  storeController.update,
);

router.get('/stores/:storeId', validateParams(storeIdParamSchema), storeController.getStoreDetail);

router.get('/stores/detail/my', accessTokenAuth, storeController.getMyStoreDetail);

router.get(
  '/stores/detail/my/product',
  accessTokenAuth,
  validateQuery(getMyProductsQuerySchema),
  storeController.getMyProducts,
);

router.post(
  '/stores/:storeId/favorite',
  accessTokenAuth,
  validateParams(storeIdParamSchema),
  storeController.userLikeRegister,
);

router.delete(
  '/stores/:storeId/favorite',
  accessTokenAuth,
  validateParams(storeIdParamSchema),
  storeController.userLikeUnregister,
);

export default router;
