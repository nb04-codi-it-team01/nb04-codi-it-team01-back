import { Router } from 'express';
import { ProductController } from './product.controller';
import prisma from '../../lib/prisma';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middleware/error-handler';

const router = Router();
const controller = new ProductController();

const attachTestUserAndStore = async (req: Request, res: Response, next: NextFunction) => {
  const sellerUserId = 'test-seller-id';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = { id: sellerUserId };

  // 1) User 생성
  await prisma.user.upsert({
    where: { id: sellerUserId },
    update: {},
    create: {
      id: sellerUserId,
      name: '테스트 셀러',
      email: 'test@example.com',
      password: 'fake',
    },
  });

  // 2) Store 생성
  await prisma.store.upsert({
    where: { userId: sellerUserId },
    update: {},
    create: {
      name: '테스트 스토어',
      userId: sellerUserId,
      address: 'test address',
      phoneNumber: '000-0000',
      content: 'test content',
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

  next();
};

router.post(
  '/products',
  attachTestUserAndStore,
  (req: Request, res: Response, next: NextFunction) => {
    // 예: 쿼리 파라미터로 에러 타입 선택
    if (req.query.error === '400') {
      return next(new AppError(400, '잘못된 요청입니다.', 'Bad Request'));
    }

    if (req.query.error === '404') {
      return next(new AppError(404, '상품을 찾을 수 없습니다.', 'Not Found'));
    }

    if (req.query.error === '500') {
      // 일반 Error 던지면 500 핸들링되는지 확인 가능
      return next(new Error('강제 500 에러'));
    }

    // 평소대로 컨트롤러 실행
    return controller.createProduct(req, res, next);
  },
);
// router.post('/products', attachTestUserAndStore, controller.createProduct);

export default router;
