import { z } from 'zod';

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, 'orderId는 필수입니다.'),
});

export const getOrdersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Number(v ?? 1))
    .refine((v) => v > 0, 'page는 1 이상이여야 합니다.'),

  limit: z
    .string()
    .optional()
    .transform((v) => Number(v ?? 10))
    .refine((v) => v > 0, 'limit는 1 이상이여야 합니다.'),

  status: z.string().optional(),

  reviewType: z.enum(['available', 'completed']).optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  sizeId: z.number().int(),
  quantity: z.number().int().min(1),
});

export const createOrderBodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\d{6,7}-\d{4}$/, {
    message: '하이픈(-)을 포함하여 전화번호를 입력해주세요. (예: 010-1234-5678)',
  }),
  address: z.string().min(1),
  orderItems: z.array(orderItemSchema).min(1),
  usePoint: z.number().int().min(0).default(0),
});

export const updateOrderBodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\d{6,7}-\d{4}$/, {
    message: '하이픈(-)을 포함하여 전화번호를 입력해주세요. (예: 010-1234-5678)',
  }),
  address: z.string().min(1),
  orderItems: z.array(orderItemSchema).min(1),
  usePoint: z.number().int().min(0),
});
