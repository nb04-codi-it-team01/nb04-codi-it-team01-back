import { z } from 'zod';

const stockSchema = z.object({
  sizeId: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
});

export const createProductSchema = z
  .object({
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
  })
  .superRefine((val, ctx) => {
    if (val.discountRate != null) {
      if (!val.discountStartTime || !val.discountEndTime) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountStartTime'],
          message: '할인율이 있으면 할인 시작/종료 시간을 모두 입력해야 합니다.',
        });
      } else if (new Date(val.discountStartTime) >= new Date(val.discountEndTime)) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountEndTime'],
          message: '할인 종료 시간은 시작 시간보다 늦어야 합니다.',
        });
      }
    }
  });

export const updateProductSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  price: z.number().int().optional(),
  content: z.string().max(100).optional(),
  image: z.url().optional(),
  discountRate: z.number().int().min(0).max(100).optional(),
  discountStartTime: z.iso.datetime().optional(),
  discountEndTime: z.iso.datetime().optional(),
  categoryName: z.string().min(1).optional(),
  isSoldOut: z.boolean().optional(),
  stocks: z.array(stockSchema).min(1),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
