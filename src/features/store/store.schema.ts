import { z } from 'zod';

export const createStoreBodySchema = z.object({
  name: z.string().min(1, '스토어 이름이 필요합니다.'),
  address: z.string().min(1, '주소가 필요합니다.'),
  detailAddress: z.string().optional(),
  phoneNumber: z.string().min(10, '전화번호가 필요합니다.'),
  content: z.string().min(1, '내용이 필요합니다.'), // 필수로 변경
  image: z.string().optional(),
});

export const updateStoreBodySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  detailAddress: z.string().optional(),
  phoneNumber: z.string().min(10).optional(),
  content: z.string().optional(),
  image: z.string().optional(),
});

export const storeIdParamSchema = z.object({
  storeId: z.string().min(1, 'storeId가 필요합니다.'),
});

export type createStoreBody = z.infer<typeof createStoreBodySchema>;
export type updateStoreBody = z.infer<typeof updateStoreBodySchema>;
export type storeIdParam = z.infer<typeof storeIdParamSchema>;
