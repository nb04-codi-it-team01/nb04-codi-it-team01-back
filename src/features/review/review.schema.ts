import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z.string(),
  orderItemId: z.string(),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;
