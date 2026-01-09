import { z } from 'zod';

export const stockSchema = z.object({
  sizeId: z.number().int().positive(),
  quantity: z.number().int().nonnegative(),
});

export const createProductSchema = z
  .object({
    name: z.string().min(1),
    price: z.coerce.number().int().nonnegative(),
    content: z
      .string()
      .min(1, { message: '상세 설명을 입력해주세요.' })
      .max(20000, { message: '내용이 너무 깁니다.' }),
    image: z.url().optional(),
    discountRate: z.coerce.number().int().min(0).max(100).optional(),
    discountStartTime: z.iso.datetime().optional(),
    discountEndTime: z.iso.datetime().optional(),
    categoryName: z
      .string()
      .min(1)
      .transform((val) => val.toUpperCase()),
    stocks: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .array(
          z.object({
            sizeId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().nonnegative(),
          }),
        )
        .min(1),
    ),
  })
  .superRefine((val, ctx) => {
    // 1. 할인율이 없으면 검증할 필요 없음
    if (val.discountRate == null) return;

    // 2. 날짜가 하나라도 들어와 있는지 확인
    const hasDateInput = val.discountStartTime || val.discountEndTime;

    // 3. [기간 한정] 날짜가 하나라도 입력되었다면 -> 둘 다 필수 + 시간 순서 검증
    if (hasDateInput) {
      if (!val.discountStartTime || !val.discountEndTime) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountStartTime'],
          message: '기간 한정 할인인 경우 시작/종료 시간을 모두 입력해야 합니다.',
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
  price: z.coerce.number().int().nonnegative().optional(),
  content: z
    .string()
    .min(1, { message: '상세 설명을 입력해주세요.' })
    .max(20000, { message: '내용이 너무 깁니다.' })
    .optional(),
  image: z.url().optional(),
  discountRate: z.coerce.number().int().min(0).max(100).optional(),
  discountStartTime: z.iso.datetime().optional(),
  discountEndTime: z.iso.datetime().optional(),
  categoryName: z
    .string()
    .min(1)
    .transform((val) => val.toUpperCase())
    .optional(),
  stocks: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    z
      .array(
        z.object({
          sizeId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().int().nonnegative(),
        }),
      )
      .min(1),
  ),
  isSoldOut: z.boolean().optional(),
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
