import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z.string(),
  orderItemId: z.string(),
});

export const updateReviewSchema = createReviewSchema.pick({
  rating: true,
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string(),
});

export const getReviewsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(5),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>;
export type ReviewIdParamSchema = z.infer<typeof reviewIdParamSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
