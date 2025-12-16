import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string(),
  sizes: z
    .array(
      z.object({
        sizeId: z.number(),
        quantity: z.number().min(1, '수량은 1 이상이어야 합니다.'),
      }),
    )
    .min(1, '최소 1개의 사이즈는 필요합니다.'),
});

export type AddCartItemBody = z.infer<typeof addCartItemSchema>;
