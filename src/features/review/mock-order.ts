import { RequestHandler } from 'express';
import prisma from '../../lib/prisma';
import { AppError } from '../../shared/middleware/error-handler';

export const attachMockOrder: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) return next(new AppError(401, '로그인이 필요합니다.'));

    const sizeId = 1;

    const order = await prisma.order.create({
      data: {
        name: '테스트 구매자',
        phoneNumber: '010-0000-0000',
        address: '테스트 주소',
        subtotal: 10000,
        totalQuantity: 1,
        buyerId: userId,
        orderItems: {
          create: {
            productId: productId,
            sizeId: sizeId,
            price: 10000,
            quantity: 1,
            isReviewed: false,
          },
        },
      },
      include: {
        orderItems: true,
      },
    });

    const createdOrderItemId = order.orderItems?.[0]?.id || '';

    req.body.orderItemId = createdOrderItemId;

    // eslint-disable-next-line no-console
    console.log(`[Mock] 가짜 주문 생성됨: ${createdOrderItemId}`);

    next();
  } catch (error) {
    console.error('Mock Order Error:', error);
    next(error);
  }
};
