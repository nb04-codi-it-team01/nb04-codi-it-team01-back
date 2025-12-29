import { z } from 'zod';

// 문의 목록 조회 쿼리 스키마
export const getInquiriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  status: z.enum(['CompletedAnswer', 'WaitingAnswer']).optional(),
});

// 문의 생성 스키마 (Product에서 사용)
export const createInquirySchema = z.object({
  title: z
    .string()
    .min(1, '문의 제목을 입력하세요')
    .max(50, '문의 제목은 최대 50자까지 입력 가능합니다'),
  content: z
    .string()
    .min(1, '문의 내용을 입력하세요')
    .max(500, '문의 내용은 최대 500자까지 입력 가능합니다'),
  isSecret: z.boolean(),
});

// 문의 수정 스키마
export const updateInquirySchema = z.object({
  title: z
    .string()
    .min(1, '문의 제목을 입력하세요')
    .max(50, '문의 제목은 최대 50자까지 입력 가능합니다'),
  content: z
    .string()
    .min(1, '문의 내용을 입력하세요')
    .max(500, '문의 내용은 최대 500자까지 입력 가능합니다'),
  isSecret: z.boolean(),
});

// 답변 생성 스키마
export const createReplySchema = z.object({
  content: z
    .string()
    .min(1, '답변 내용을 입력하세요')
    .max(500, '답변 내용은 최대 500자까지 입력 가능합니다'),
});

// 답변 수정 스키마
export const updateReplySchema = z.object({
  content: z
    .string()
    .min(1, '답변 내용을 입력하세요')
    .max(500, '답변 내용은 최대 500자까지 입력 가능합니다'),
});

// Path Parameter 스키마
export const inquiryIdParamSchema = z.object({
  inquiryId: z.string(),
});

export const replyIdParamSchema = z.object({
  replyId: z.string(),
});

// 타입 추론
export type GetInquiriesQuery = z.infer<typeof getInquiriesQuerySchema>;
export type CreateInquiryBody = z.infer<typeof createInquirySchema>;
export type UpdateInquiryBody = z.infer<typeof updateInquirySchema>;
export type CreateReplyBody = z.infer<typeof createReplySchema>;
export type UpdateReplyBody = z.infer<typeof updateReplySchema>;
export type InquiryIdParam = z.infer<typeof inquiryIdParamSchema>;
export type ReplyIdParam = z.infer<typeof replyIdParamSchema>;
