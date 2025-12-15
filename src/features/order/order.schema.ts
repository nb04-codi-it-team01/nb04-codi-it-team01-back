import { z } from 'zod';

export const ProductResponseSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  name: z.string(),
  price: z.number(),
  image: z.string(),
  discountRate: z.number(),
  discountStartTime: z
    .date()
    .nullable()
    .transform((v) => v?.toISOString() ?? null),
  discountEndTime: z
    .date()
    .nullable()
    .transform((v) => v?.toISOString() ?? null),
  createdAt: z.date().transform((v) => v.toISOString()),
  updatedAt: z.date().transform((v) => v.toISOString()),
});

export const createOrderSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  address: z.string().min(1, '주소는 필수입니다.'),
  orderItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        sizeId: z.number().int().positive(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, '주문 상품은 최소 1개 이상이여야 합니다.'),
  usePoint: z.number().int().min(0).default(0),
});

export type CreateOrder = z.infer<typeof createOrderSchema>;
