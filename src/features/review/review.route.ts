import { Router } from 'express';
import { createReviewController } from './review.composition';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import { accessTokenAuth } from '../../shared/middleware/auth';
import { productIdParamSchema } from '../product/product.schema';
import {
  createReviewSchema,
  getReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from './review.schema';

const router = Router();
const controller = createReviewController();

router.post(
  '/product/:productId/reviews',
  accessTokenAuth,
  validateParams(productIdParamSchema),
  validateBody(createReviewSchema),
  controller.createReview,
);

router.patch(
  '/review/:reviewId',
  accessTokenAuth,
  validateParams(reviewIdParamSchema),
  validateBody(updateReviewSchema),
  controller.updateReview,
);

router.delete(
  '/review/:reviewId',
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

router.get('/review/:reviewId', validateParams(reviewIdParamSchema), controller.getReview);

export default router;
