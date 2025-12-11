import { Router } from 'express';
import { ReviewController } from './review.controller';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { accessTokenAuth } from '../../lib/passport';
import { attachMockOrder } from './mock-order';
import { productIdParamSchema } from '../product/product.schema';
import { createReviewSchema } from './review.schema';

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

export default router;
