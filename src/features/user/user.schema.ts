import { z } from 'zod';
import { UserType } from '@prisma/client';

// 회원가입 스키마
export const createUserSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다.'),
  email: z.email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  type: z.enum(UserType, {
    message: 'BUYER 또는 SELLER를 선택해야 합니다.',
  }),
});

// 내 정보 수정 스키마 (multipart/form-data)
export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  currentPassword: z.string().min(1, '현재 비밀번호는 필수입니다.'),
  image: z.string().optional(), // S3 URL
});

// 타입 추론
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
