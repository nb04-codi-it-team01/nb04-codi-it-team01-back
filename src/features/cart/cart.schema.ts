import { z } from 'zod';

export const cartItemSchema = z.object({
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

export const cartIdParamSchema = z.object({
  cartItemId: z.string(),
});

export type CartItemBody = z.infer<typeof cartItemSchema>;
export type CartItemIdParamSchema = z.infer<typeof cartIdParamSchema>;
