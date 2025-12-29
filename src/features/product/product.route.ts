import { Router } from 'express';
import { createProductController } from './product.composition';
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
const controller = createProductController();

/**
 * POST /api/products - 상품 등록
 */
router.post(
  '/products',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateBody(createProductSchema),
  controller.createProduct,
);

/**
 * PATCH /api/products/:productId - 상품 수정
 */
router.patch(
  '/products/:productId',
  accessTokenAuth,
  upload.single('image'),
  mapImageToBody('image'),
  validateParams(productIdParamSchema),
  validateBody(updateProductBodySchema),
  controller.updateProduct,
);

/**
 * DELETE /api/products/:productId- 상품 삭제
 */
router.delete(
  '/products/:productId',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  controller.deleteProduct,
);

/**
 * GET /api/products - 상품 목록 조회
 */
router.get(
  '/products',
  optionalAuth,
  validateQuery(getProductsQuerySchema),
  controller.getProducts,
);

/**
 * GET /api/products - 상품 상세 조회
 */
router.get(
  '/products/:productId',
  optionalAuth,
  validateParams(productIdParamSchema),
  controller.getProductDetail,
);

/**
 * POST /api/products/:productId/inquiries - 상품 문의 등록
 */
router.post(
  '/products/:productId/inquiries',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  validateBody(createProductInquirySchema),
  controller.createProductInquiry,
);

/**
 * GET /api/products/:productId/inquiries - 상품 문의 조회
 */
router.get(
  '/products/:productId/inquiries',
  optionalAuth,
  validateParams(productIdParamSchema),
  controller.getProductInquiries,
);

export default router;
