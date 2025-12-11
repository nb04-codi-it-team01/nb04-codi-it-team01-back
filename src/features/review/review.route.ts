import { Router } from 'express';
import { ReviewController } from './review.controller';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { accessTokenAuth } from '../../lib/passport';
import { attachMockOrder } from './mock-order';
import { productIdParamSchema } from '../product/product.schema';
import { createReviewSchema, reviewIdParamSchema, updateReviewSchema } from './review.schema';

const router = Router();
const controller = new ReviewController();

router.post(
  '/products/:productId/reviews',
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

export default router;
