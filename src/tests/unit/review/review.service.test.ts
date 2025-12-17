import { ReviewService } from '../../../features/review/review.service';
import { ReviewRepository } from '../../../features/review/review.repository';
import { AppError } from '../../../shared/middleware/error-handler';
import prisma from '../../../lib/prisma';
import { UserType, Review, OrderItem, Prisma, Order } from '@prisma/client';
import { ReviewMapper } from '../../../features/review/review.mapper';

// 1. 의존성 모킹
jest.mock('../../../features/review/review.repository');
jest.mock('../../../lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let mockReviewRepository: jest.Mocked<ReviewRepository>;

  // 트랜잭션 Client 모킹
  const mockTx = {
    review: { create: jest.fn() },
    orderItem: { update: jest.fn() },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReviewRepository = new ReviewRepository() as jest.Mocked<ReviewRepository>;
    reviewService = new ReviewService(mockReviewRepository);

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        return callback(mockTx);
      },
    );
  });

  describe('createReview', () => {
    const userId = 'user-123';
    const productId = 'product-123';
    const body = {
      orderItemId: 'order-item-123',
      rating: 5,
      content: '좋은 상품입니다.',
    };

    const mockOrderItem = {
      id: 'order-item-123',
      productId: 'product-123',
      isReviewed: false,
      orderId: 'order-123',
      quantity: 1,
      price: 10000,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: { buyerId: userId } as unknown as Order,
    } as unknown as OrderItem & { order: Order | null };

    const mockCreatedReview: Review = {
      id: 'review-123',
      userId,
      productId,
      orderItemId: body.orderItemId,
      rating: body.rating,
      content: body.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('모든 조건이 충족되면 리뷰 생성 및 트랜잭션 실행 성공', async () => {
      // Mock 설정
      mockReviewRepository.findOrderItem.mockResolvedValue(mockOrderItem);
      (mockTx.review.create as jest.Mock).mockResolvedValue(mockCreatedReview);

      const result = await reviewService.createReview(userId, productId, body);

      // 검증
      expect(mockReviewRepository.findOrderItem).toHaveBeenCalledWith(body.orderItemId);
      expect(prisma.$transaction).toHaveBeenCalled();

      expect(mockTx.review.create).toHaveBeenCalledWith({
        data: {
          userId,
          productId,
          orderItemId: body.orderItemId,
          rating: body.rating,
          content: body.content,
        },
      });

      expect(mockTx.orderItem.update).toHaveBeenCalledWith({
        where: { id: body.orderItemId },
        data: { isReviewed: true },
      });

      expect(result).toEqual(ReviewMapper.toResponse(mockCreatedReview));
    });

    it('주문 내역이 없으면 404 에러 발생', async () => {
      mockReviewRepository.findOrderItem.mockResolvedValue(null);

      await expect(reviewService.createReview(userId, productId, body)).rejects.toThrow(
        new AppError(404, '주문 내역이 없습니다.'),
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('구매자가 아니면 403 에러 발생', async () => {
      // Order 타입 캐스팅 유지
      const invalidOrderItem = {
        ...mockOrderItem,
        order: { buyerId: 'other-user' } as unknown as Order,
      } as unknown as OrderItem & { order: Order | null };

      mockReviewRepository.findOrderItem.mockResolvedValue(invalidOrderItem);

      await expect(reviewService.createReview(userId, productId, body)).rejects.toThrow(
        new AppError(403, '구매자만 리뷰를 쓸 수 있습니다.'),
      );
    });

    it('해당 상품에 대한 주문이 아니면 400 에러 발생', async () => {
      const invalidOrderItem = {
        ...mockOrderItem,
        productId: 'other-product',
      } as unknown as OrderItem & { order: Order | null };

      mockReviewRepository.findOrderItem.mockResolvedValue(invalidOrderItem);

      await expect(reviewService.createReview(userId, productId, body)).rejects.toThrow(
        new AppError(400, '해당 상품에 대한 주문이 아닙니다.'),
      );
    });

    it('이미 리뷰를 작성했으면 409 에러 발생', async () => {
      const reviewedOrderItem = {
        ...mockOrderItem,
        isReviewed: true,
      } as unknown as OrderItem & { order: Order | null };

      mockReviewRepository.findOrderItem.mockResolvedValue(reviewedOrderItem);

      await expect(reviewService.createReview(userId, productId, body)).rejects.toThrow(
        new AppError(409, '이미 리뷰를 작성했습니다.'),
      );
    });
  });

  describe('updateReview', () => {
    const userId = 'user-123';
    const reviewId = 'review-123';
    const body = { rating: 4 };

    const mockReview: Review = {
      id: reviewId,
      userId: userId,
      productId: 'product-123',
      orderItemId: 'order-item-123',
      rating: 5,
      content: 'Old Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('작성자 본인이면 리뷰 수정 성공', async () => {
      const updatedReview: Review = { ...mockReview, rating: 4 };

      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.update.mockResolvedValue(updatedReview);

      const result = await reviewService.updateReview(userId, reviewId, body);

      expect(mockReviewRepository.findById).toHaveBeenCalledWith(reviewId);
      expect(mockReviewRepository.update).toHaveBeenCalledWith(reviewId, { rating: 4 });
      expect(result.rating).toBe(4);
    });

    it('리뷰가 존재하지 않으면 404 에러 발생', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.updateReview(userId, reviewId, body)).rejects.toThrow(
        new AppError(404, '리뷰를 찾을 수 없습니다.'),
      );
    });

    it('작성자가 아니면 403 에러 발생', async () => {
      const otherUserReview: Review = { ...mockReview, userId: 'other-user' };
      mockReviewRepository.findById.mockResolvedValue(otherUserReview);

      await expect(reviewService.updateReview(userId, reviewId, body)).rejects.toThrow(
        new AppError(403, '리뷰 수정 권한이 없습니다.'),
      );
    });
  });

  describe('deleteReview', () => {
    const reviewId = 'review-123';
    const mockActor = { id: 'user-123', type: UserType.BUYER };

    const mockReview: Review = {
      id: reviewId,
      userId: 'user-123',
      productId: 'product-1',
      orderItemId: 'order-item-123',
      rating: 5,
      content: 'content',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('자신의 리뷰이면 삭제 성공', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      mockReviewRepository.delete.mockResolvedValue(mockReview);

      await reviewService.deleteReview(reviewId, mockActor);

      expect(mockReviewRepository.findById).toHaveBeenCalledWith(reviewId);
      expect(mockReviewRepository.delete).toHaveBeenCalledWith(reviewId, mockReview.orderItemId);
    });

    it('리뷰가 없으면 404 에러 발생', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.deleteReview(reviewId, mockActor)).rejects.toThrow(
        new AppError(404, '리뷰를 찾을 수 없습니다.'),
      );
    });

    it('타인의 리뷰를 삭제하려 하면 403 에러 발생', async () => {
      const otherReview: Review = { ...mockReview, userId: 'other-user' };
      mockReviewRepository.findById.mockResolvedValue(otherReview);

      await expect(reviewService.deleteReview(reviewId, mockActor)).rejects.toThrow(
        new AppError(403, '자신의 리뷰만 삭제할 수 있습니다.'),
      );
    });
  });

  describe('getReview', () => {
    const reviewId = 'review-123';
    const mockReview: Review = {
      id: reviewId,
      userId: 'user-123',
      productId: 'product-1',
      orderItemId: 'order-item-1',
      rating: 5,
      content: 'content',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('리뷰 조회 성공', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      const result = await reviewService.getReview(reviewId);

      expect(mockReviewRepository.findById).toHaveBeenCalledWith(reviewId);
      expect(result).toEqual(ReviewMapper.toResponse(mockReview));
    });

    it('리뷰가 없으면 404 에러 발생', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.getReview(reviewId)).rejects.toThrow(
        new AppError(404, '리뷰를 찾을 수 없습니다.'),
      );
    });
  });

  describe('getReviews', () => {
    const productId = 'product-123';
    const query = { page: 1, limit: 10 };

    const mockReviews: Review[] = [
      {
        id: '1',
        userId: 'u1',
        productId,
        orderItemId: 'o1',
        rating: 5,
        content: 'A',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        userId: 'u2',
        productId,
        orderItemId: 'o2',
        rating: 4,
        content: 'B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('상품의 리뷰 목록 조회 성공', async () => {
      mockReviewRepository.findAllByProductId.mockResolvedValue(mockReviews);

      const result = await reviewService.getReviews(productId, query);

      expect(mockReviewRepository.findAllByProductId).toHaveBeenCalledWith(productId, 0, 10);

      const expected = mockReviews.map(ReviewMapper.toResponse);
      expect(result).toEqual(expected);
    });
  });
});
