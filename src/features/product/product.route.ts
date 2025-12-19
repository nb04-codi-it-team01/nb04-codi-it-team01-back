import { Router } from 'express';
import { ProductController } from './product.controller';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import {
  createProductInquirySchema,
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductBodySchema,
} from './product.schema';
import { mapImageToBody, upload } from '../../shared/middleware/upload-handler';
import { accessTokenAuth, optionalAuth } from '../../lib/passport';

const router = Router();
const controller = new ProductController();

router.post(
  '/products',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateBody(createProductSchema),
  controller.createProduct,
);
router.patch(
  '/products/:productId',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateParams(productIdParamSchema),
  validateBody(updateProductBodySchema),
  controller.updateProduct,
);
router.delete(
  '/products/:productId',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  controller.deleteProduct,
);
router.get(
  '/products',
  optionalAuth,
  validateQuery(getProductsQuerySchema),
  controller.getProducts,
);
router.get(
  '/products/:productId',
  optionalAuth,
  validateParams(productIdParamSchema),
  controller.getProductDetail,
);
router.post(
  '/products/:productId/inquiries',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  validateBody(createProductInquirySchema),
  controller.createProductInquiry,
);
router.get(
  '/products/:productId/inquiries',
  optionalAuth,
  validateParams(productIdParamSchema),
  controller.getProductInquiries,
);

export default router;
