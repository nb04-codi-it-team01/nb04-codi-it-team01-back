import type { RequestHandler } from 'express';
import { ReviewService } from './review.service';
import { CreateReviewBody, GetReviewsQuery, UpdateReviewBody } from './review.schema';

export class ReviewController {
  constructor(private readonly reviewService = new ReviewService()) {}

  createReview: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { productId } = req.params as { productId: string };
    const body = req.body as CreateReviewBody;

    const review = await this.reviewService.createReview(user.id, productId, body);
    return res.status(201).json(review);
  };

  updateReview: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { reviewId } = req.params as { reviewId: string };
    const body = req.body as UpdateReviewBody;

    const response = await this.reviewService.updateReview(user.id, reviewId, body);
    return res.status(200).json(response);
  };

  deleteReview: RequestHandler = async (req, res) => {
    const user = req.user!;
    const { reviewId } = req.params as { reviewId: string };

    await this.reviewService.deleteReview(reviewId, {
      id: user.id,
      type: user.type,
    });

    return res.status(204).send();
  };

  getReview: RequestHandler = async (req, res) => {
    const { reviewId } = req.params as { reviewId: string };
    const response = await this.reviewService.getReview(reviewId);

    return res.status(200).json(response);
  };

  getReviews: RequestHandler = async (req, res) => {
    const { productId } = req.params as { productId: string };
    const query = req.query as unknown as GetReviewsQuery;

    const response = await this.reviewService.getReviews(productId, query);

    return res.status(200).json(response);
  };
}
