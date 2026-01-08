import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z
    .string()
    .trim() // 앞뒤 공백 제거 (공백만 채우는 꼼수 방지)
    .min(10, { message: '리뷰 내용은 최소 10자 이상이어야 합니다.' })
    .max(1000, { message: '리뷰 내용은 최대 1000자까지 가능합니다.' }), // DB 용량 고려
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
