import { z } from 'zod';
export const getNotificationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .refine((val) => val > 0, { message: 'page는 1 이상의 숫자여야 합니다.' }),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .refine((val) => val > 0, { message: 'pageSize는 1 이상의 숫자여야 합니다.' }),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
