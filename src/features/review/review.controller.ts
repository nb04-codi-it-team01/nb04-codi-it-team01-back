import type { RequestHandler } from 'express';
import { AppError } from '../../shared/middleware/error-handler';
import { ReviewService } from './review.service';
import { productIdParamSchema } from '../product/product.schema';
import { CreateReviewBody, createReviewSchema } from './review.schema';

export class ReviewController {
  constructor(private readonly reviewService = new ReviewService()) {}

  createReview: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user) {
      throw new AppError(401, '인증이 필요합니다.', 'Unauthorized');
    }

    const parsedParams = productIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }

    const { productId } = parsedParams.data;

    const parsedBody = createReviewSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw parsedBody.error;
    }

    const body: CreateReviewBody = parsedBody.data;
    const review = await this.reviewService.createReview(user.id, productId, body);
    return res.status(201).json(review);
  };
}
