import { AppError } from '../../shared/middleware/error-handler';
import { CreateReviewBody } from './review.schema';
import prisma from '../../lib/prisma';
import { ReviewRepository } from './review.repository';
import { ReviewMapper } from './review.mapper';

export class ReviewService {
  constructor(private readonly reviewRepository = new ReviewRepository()) {}

  async createReview(userId: string, productId: string, body: CreateReviewBody) {
    const { orderItemId, rating, content } = body;

    // 1. 유효성 검증
    const orderItem = await this.reviewRepository.findOrderItem(orderItemId);

    if (!orderItem) throw new AppError(404, '주문 내역이 없습니다.');
    if (orderItem.order?.buyerId !== userId)
      throw new AppError(403, '구매자만 리뷰를 쓸 수 있습니다.');
    if (orderItem.productId !== productId)
      throw new AppError(400, '해당 상품에 대한 주문이 아닙니다.');
    if (orderItem.isReviewed) throw new AppError(409, '이미 리뷰를 작성했습니다.');

    // 2. 트랜잭션 실행 (리뷰 생성 + isReviewed 업데이트)
    return await prisma.$transaction(async (tx) => {
      // 리뷰 생성
      const review = await tx.review.create({
        data: {
          userId,
          productId,
          orderItemId,
          rating,
          content,
        },
      });

      // 주문 아이템에 "리뷰 작성됨" 표시
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { isReviewed: true },
      });

      return ReviewMapper.toResponse(review);
    });
  }
}
