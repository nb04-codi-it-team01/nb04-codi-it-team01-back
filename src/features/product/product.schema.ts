import { z } from 'zod';

export const stockSchema = z.object({
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

export const updateProductBodySchema = z.object({
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

export const productIdParamSchema = z.object({
  productId: z.string(),
});

export const getProductsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1))
    .refine((v) => Number.isInteger(v) && v > 0, 'page는 1 이상의 정수여야 합니다.'),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 16))
    .refine((v) => Number.isInteger(v) && v > 0, 'pageSize는 1 이상의 정수여야 합니다.'),

  search: z.string().optional(),

  sort: z
    .enum(['mostReviewed', 'recent', 'lowPrice', 'highPrice', 'highRating', 'salesRanking'])
    .optional(),

  priceMin: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  priceMax: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),

  size: z.string().optional(),
  favoriteStore: z.string().optional(),
  categoryName: z.string().optional(),
});

export const createProductInquirySchema = z.object({
  title: z.string(),
  content: z.string(),
  isSecret: z.boolean(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type ProductIdParamSchema = z.infer<typeof productIdParamSchema>;
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;
export type CreateProductInquiryBody = z.infer<typeof createProductInquirySchema>;
