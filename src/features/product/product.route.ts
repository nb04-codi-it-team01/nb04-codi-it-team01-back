import { Router } from 'express';
import { ProductController } from './product.controller';
import prisma from '../../lib/prisma';
import type { Request, Response, NextFunction } from 'express';

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
      password: 'fake', // 필수 필드이면 아무거나 넣기
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

router.post('/products', attachTestUserAndStore, controller.createProduct);

export default router;
