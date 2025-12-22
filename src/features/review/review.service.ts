import { AppError } from '../../shared/middleware/error-handler';
import { CreateReviewBody, GetReviewsQuery, UpdateReviewBody } from './review.schema';
import prisma from '../../lib/prisma';
import { ReviewRepository } from './review.repository';
import { ReviewMapper } from './review.mapper';
import { ReviewDetailResponseDto, ReviewResponseDto } from './review.dto';
import { UserType } from '@prisma/client';

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
        include: {
          user: {
            select: {
              name: true,
            },
          },
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

  async updateReview(
    userId: string,
    reviewId: string,
    body: UpdateReviewBody,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, '리뷰를 찾을 수 없습니다.');
    }

    if (review.userId !== userId) {
      throw new AppError(403, '리뷰 수정 권한이 없습니다.');
    }

    const updatedReview = await this.reviewRepository.update(reviewId, {
      rating: body.rating,
    });

    return ReviewMapper.toResponse(updatedReview);
  }

  async deleteReview(reviewId: string, actorUser: { id: string; type: UserType }) {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new AppError(404, '리뷰를 찾을 수 없습니다.');
    }

    if (review.userId !== actorUser.id) {
      throw new AppError(403, '자신의 리뷰만 삭제할 수 있습니다.');
    }

    await this.reviewRepository.delete(reviewId, review.orderItemId);
  }

  async getReview(reviewId: string): Promise<ReviewDetailResponseDto> {
    const review = await this.reviewRepository.findReviewDetailById(reviewId);

    if (!review) {
      throw new AppError(404, '리뷰를 찾을 수 없습니다.');
    }

    return ReviewMapper.toDetailResponse(review);
  }

  async getReviews(productId: string, query: GetReviewsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // 1. 전체 개수 조회
    const totalCount = await this.reviewRepository.countByProductId(productId);

    // 2. 데이터 조회
    const reviews = await this.reviewRepository.findAllByProductId(productId, skip, limit);

    // 3. 응답 구조 변경 (배열 -> 객체)
    return {
      items: reviews.map(ReviewMapper.toResponse), // 실제 리뷰 목록
      meta: {
        total: totalCount,
        page: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}
