import { ReviewRepository } from '../../../src/features/review/review.repository';
import prisma from '../../../src/lib/prisma';
import { Prisma } from '@prisma/client';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    orderItem: {
      findUnique: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('ReviewRepository', () => {
  let reviewRepository: ReviewRepository;

  const mockTx = {
    orderItem: { update: jest.fn() },
    review: { delete: jest.fn() },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    reviewRepository = new ReviewRepository();

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        return callback(mockTx);
      },
    );
  });

  describe('findOrderItem', () => {
    it('주문 아이템 ID로 조회하며 order 정보를 포함', async () => {
      const orderItemId = 'item-1';
      await reviewRepository.findOrderItem(orderItemId);

      expect(prisma.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: orderItemId },
        include: { order: true },
      });
    });
  });

  describe('findById', () => {
    it('리뷰 ID로 조회하며 작성자 이름(user.name)을 포함', async () => {
      const reviewId = 'review-1';
      await reviewRepository.findById(reviewId);

      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
        include: {
          user: {
            select: { name: true },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('리뷰를 수정하고 작성자 이름을 포함하여 반환', async () => {
      const reviewId = 'review-1';
      const updateData: Prisma.ReviewUpdateInput = { rating: 5, content: 'Updated' };

      await reviewRepository.update(reviewId, updateData);

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: updateData,
        include: {
          user: {
            select: { name: true },
          },
        },
      });
    });
  });

  describe('delete', () => {
    it('트랜잭션 내에서 isReviewed를 false로 변경하고 리뷰를 삭제', async () => {
      const reviewId = 'review-1';
      const orderItemId = 'item-1';

      await reviewRepository.delete(reviewId, orderItemId);

      // 1. 트랜잭션 시작 확인
      expect(prisma.$transaction).toHaveBeenCalled();

      // 2. 트랜잭션 내부 로직 확인 (mockTx 사용)
      // orderItem 업데이트 확인
      expect(mockTx.orderItem.update).toHaveBeenCalledWith({
        where: { id: orderItemId },
        data: { isReviewed: false },
      });

      // review 삭제 확인
      expect(mockTx.review.delete).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
    });
  });

  describe('findAllByProductId', () => {
    const productId = 'prod-1';

    it('상품 ID로 리뷰 목록을 페이징하여 조회', async () => {
      const skip = 0;
      const take = 10;

      await reviewRepository.findAllByProductId(productId, skip, take);

      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { productId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true },
          },
        },
      });
    });

    it('skip과 take가 주어지지 않으면 기본값(0, 5)을 사용', async () => {
      await reviewRepository.findAllByProductId(productId, 0, 0);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 5, // 코드의 || 5 로직 확인
        }),
      );
    });
  });

  describe('countByProductId', () => {
    it('상품 ID에 해당하는 리뷰 개수를 반환', async () => {
      const productId = 'prod-1';
      // Mock 반환값 설정
      (prisma.review.count as jest.Mock).mockResolvedValue(10);

      const count = await reviewRepository.countByProductId(productId);

      expect(prisma.review.count).toHaveBeenCalledWith({
        where: { productId },
      });
      expect(count).toBe(10);
    });
  });
});
