import { Router } from 'express';
import { ReviewController } from './review.controller';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import { accessTokenAuth } from '../../lib/passport';
import { attachMockOrder } from './mock-order';
import { productIdParamSchema } from '../product/product.schema';
import {
  createReviewSchema,
  getReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from './review.schema';

const router = Router();
const controller = new ReviewController();

router.post(
  '/product/:productId/reviews',
  accessTokenAuth,
  attachMockOrder,
  validateParams(productIdParamSchema),
  validateBody(createReviewSchema),
  controller.createReview,
);

router.patch(
  '/reviews/:reviewId',
  accessTokenAuth,
  validateParams(reviewIdParamSchema),
  validateBody(updateReviewSchema),
  controller.updateReview,
);

router.delete(
  '/reviews/:reviewId',
  accessTokenAuth,
  validateParams(reviewIdParamSchema),
  controller.deleteReview,
);

router.get(
  '/product/:productId/reviews',
  validateParams(productIdParamSchema),
  validateQuery(getReviewsQuerySchema),
  controller.getReviews,
);

router.get('/reviews/:reviewId', validateParams(reviewIdParamSchema), controller.getReview);

export default router;
