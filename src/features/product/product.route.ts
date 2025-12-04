import { Router } from 'express';
import { ProductController } from './product.controller';
import prisma from '../../lib/prisma';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middleware/error-handler';

const router = Router();
const controller = new ProductController();

/**
 * 개발/테스트용 미들웨어:
 * - 테스트용 SELLER 유저를 req.user에 심어주고
 * - 해당 유저의 Store + Size들을 upsert 한다.
 *
 * 실제 운영 환경에서는 다른 인증 미들웨어로 교체하면 됨.
 */
const attachTestUserAndStore = async (req: Request, _res: Response, next: NextFunction) => {
  const sellerUserId = 'test-seller-id';

  // 인증 유저 정보 주입 (SELLER 역할)
  req.user = { id: sellerUserId, type: 'SELLER' };

  // 1) User upsert
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

  // 2) Store upsert
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

  // 3) Size upsert
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

  next();
};

router.post(
  '/products',
  attachTestUserAndStore,
  (req: Request, res: Response, next: NextFunction) => {
    // 예: 쿼리 파라미터로 에러 타입 선택
    if (req.query.error === '400') {
      return next(new AppError(400, '잘못된 요청입니다.'));
    }

    if (req.query.error === '404') {
      return next(new AppError(404, '상품을 찾을 수 없습니다.'));
    }

    if (req.query.error === '500') {
      // 일반 Error 던지면 500 핸들링되는지 확인 가능
      return next(new Error('강제 500 에러'));
    }

    // 평소대로 컨트롤러 실행
    return controller.createProduct(req, res, next);
  },
);

router.patch(
  '/products/:id',
  attachTestUserAndStore,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.query.error === '400') {
      return next(new AppError(400, '잘못된 요청입니다.'));
    }

    if (req.query.error === '404') {
      return next(new AppError(404, '상품을 찾을 수 없습니다.'));
    }

    if (req.query.error === '500') {
      return next(new Error('강제 500 에러'));
    }

    req.body.id = req.params.id;

    return controller.updateProduct(req, res, next);
  },
);
// router.post('/products', attachTestUserAndStore, controller.createProduct);
// router.patch('/products/:id', attachTestUserAndStore, controller.updateProduct);

export default router;
