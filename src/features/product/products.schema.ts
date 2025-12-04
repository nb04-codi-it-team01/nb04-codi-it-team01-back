import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  content: z.string().optional(),
  image: z.url().optional(),
  discountRate: z.number().int().min(0).max(100).optional(),
  discountStartTime: z.iso.datetime().optional(),
  discountEndTime: z.iso.datetime().optional(),
  categoryName: z.string().min(1),
  stocks: z
    .array(
      z.object({
        sizeId: z.number().int().positive(),
        quantity: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
