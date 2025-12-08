import { Router } from 'express';
import { ProductController } from './product.controller';
import prisma from '../../lib/prisma';
import type { RequestHandler } from 'express';
import { AppError } from '../../shared/middleware/error-handler';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import {
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductBodySchema,
} from './product.schema';

const router = Router();
const controller = new ProductController();

/**
 * 개발/테스트용 미들웨어:
 * - 테스트용 SELLER 유저를 req.user에 심어주고
 * - 해당 유저의 Store + Size들을 upsert 한다.
 *
 * 실제 운영 환경에서는 다른 인증 미들웨어로 교체하면 됨.
 */

const attachTestUserAndStore: RequestHandler = (req, _res, next) => {
  (async () => {
    const sellerUserId = 'test-seller-id';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.user = { id: sellerUserId, type: 'SELLER' } as any;

    await prisma.user.upsert({
      where: { id: sellerUserId },
      update: {},
      create: {
        id: sellerUserId,
        name: '테스트 셀러',
        email: 'test@example.com',
        password: 'fake',
        type: 'SELLER',
      },
    });

    await prisma.store.upsert({
      where: { userId: sellerUserId },
      update: {},
      create: {
        name: '테스트 스토어',
        userId: sellerUserId,
        address: 'test address',
        phoneNumber: '000-0000',
        content: 'test content',
        image: '',
        detailAddress: null,
      },
    });

    const sizes = [
      { id: 1, en: 'XS', ko: 'XS' },
      { id: 2, en: 'S', ko: 'S' },
      { id: 3, en: 'M', ko: 'M' },
      { id: 4, en: 'L', ko: 'L' },
      { id: 5, en: 'XL', ko: 'XL' },
      { id: 6, en: 'FREE', ko: 'FREE' },
    ];

    for (const size of sizes) {
      await prisma.size.upsert({
        where: { id: size.id },
        update: {},
        create: size,
      });
    }
  })()
    .then(() => next())
    .catch((err) => next(err));
};

const errorTestMiddleware: RequestHandler = (req, _res, next) => {
  if (req.query.error === '400') {
    return next(new AppError(400, '잘못된 요청입니다.'));
  }

  if (req.query.error === '404') {
    return next(new AppError(404, '상품을 찾을 수 없습니다.'));
  }

  if (req.query.error === '500') {
    return next(new Error('강제 500 에러'));
  }

  return next();
};

router.post(
  '/products',
  attachTestUserAndStore,
  errorTestMiddleware,
  validateBody(createProductSchema),
  controller.createProduct,
);
router.patch(
  '/products/:productId',
  attachTestUserAndStore,
  errorTestMiddleware,
  validateBody(updateProductBodySchema),
  controller.updateProduct,
);
router.delete(
  '/products/:productId',
  attachTestUserAndStore,
  errorTestMiddleware,
  validateParams(productIdParamSchema),
  controller.deleteProduct,
);
router.get(
  '/products',
  attachTestUserAndStore,
  errorTestMiddleware,
  validateQuery(getProductsQuerySchema),
  controller.getProducts,
);
router.get(
  '/products/:productId',
  attachTestUserAndStore,
  errorTestMiddleware,
  validateParams(productIdParamSchema),
  controller.getProductDetail,
);

export default router;
