import { Review } from '@prisma/client';
import { ReviewResponseDto } from './review.dto';

export class ReviewMapper {
  static toResponse(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      userId: review.userId ?? '',
      productId: review.productId ?? '',
      rating: review.rating,
      content: review.content ?? '',
      createdAt: review.createdAt,
    };
  }
}
