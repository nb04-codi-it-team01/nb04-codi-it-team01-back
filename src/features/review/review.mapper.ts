import { Review } from '@prisma/client';
import { ReviewDetailType } from './review.type';
import { ReviewDetailResponseDto, ReviewResponseDto } from './review.dto';

type ReviewWithUser = Review & {
  user: {
    name: string;
  } | null;
};
export class ReviewMapper {
  static toResponse(review: ReviewWithUser): ReviewResponseDto {
    return {
      id: review.id,
      userId: review.userId ?? '',
      productId: review.productId ?? '',
      rating: review.rating,
      content: review.content ?? '',
      createdAt: review.createdAt,
      user: {
        name: review.user?.name ?? '알 수 없음',
      },
    };
  }

  static toDetailResponse(review: ReviewDetailType): ReviewDetailResponseDto {
    const orderItem = review.orderItem;
    const product = orderItem?.product;

    return {
      reviewId: review.id,
      productName: product?.name ?? '삭제된 상품',
      size: {
        en: orderItem?.size.en ?? '',
        ko: orderItem?.size.ko ?? '',
      },
      price: orderItem?.price ?? 0,
      quantity: orderItem?.quantity ?? 0,
      rating: review.rating,
      content: review.content ?? '',
      reviewer: review.user?.name ?? '알 수 없음',
      reviewCreatedAt: review.createdAt.toISOString(),
      purchasedAt: orderItem?.order?.createdAt.toISOString() ?? '',
    };
  }
}
