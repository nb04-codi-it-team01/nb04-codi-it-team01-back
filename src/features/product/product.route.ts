import { Router } from 'express';
import { createProductController } from './product.composition';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import { accessTokenAuth, optionalAuth } from '../../lib/passport';
import {
  createProductInquirySchema,
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductBodySchema,
} from './product.schema';

const router = Router();
const controller = createProductController();

// 1. 상품 생성
router.post(
  '/products',
  accessTokenAuth,
  validateBody(createProductSchema),
  controller.createProduct,
);

// 2. 상품 수정
router.patch(
  '/products/:productId',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  validateBody(updateProductBodySchema),
  controller.updateProduct,
);

// 3. 상품 삭제
router.delete(
  '/products/:productId',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  controller.deleteProduct,
);

// 4. 상품 목록 조회 (누구나 가능 -> Auth 미들웨어 없음)
router.get('/products', validateQuery(getProductsQuerySchema), controller.getProducts);

// 5. 상품 상세 조회 (누구나 가능)
router.get(
  '/products/:productId',
  validateParams(productIdParamSchema),
  controller.getProductDetail,
);

// 6. 상품 문의 등록 (회원만)
router.post(
  '/products/:productId/inquiries',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  validateBody(createProductInquirySchema),
  controller.createProductInquiry,
);

// 7. 상품 문의 조회
router.get(
  '/products/:productId/inquiries',
  optionalAuth,
  validateParams(productIdParamSchema),
  controller.getProductInquiries,
);

export default router;
