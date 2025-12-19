import { Review } from '@prisma/client';
import { ReviewResponseDto } from './review.dto';

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
}
