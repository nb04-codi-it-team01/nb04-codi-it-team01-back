import { Inquiry, InquiryReply } from '@prisma/client';
import type { InquiryWithRelations, InquiryDetail, ReplyWithUser } from './inquiry.type';
import type {
  InquiryListItemDto,
  InquiryListResponseDto,
  InquiryDetailDto,
  InquiryDto,
  ReplyDto,
  InquiryReplyDto,
} from './inquiry.dto';

// 문의 목록 아이템 변환
export const toInquiryListItemDto = (inquiry: InquiryWithRelations): InquiryListItemDto => {
  return {
    id: inquiry.id,
    title: inquiry.title,
    isSecret: inquiry.isSecret,
    status: inquiry.status,
    product: {
      id: inquiry.product!.id,
      name: inquiry.product!.name,
      image: inquiry.product!.image ?? '',
      store: {
        id: inquiry.product!.store!.id,
        name: inquiry.product!.store!.name,
      },
    },
    user: {
      name: inquiry.user!.name,
    },
    createdAt: inquiry.createdAt.toISOString(),
    content: inquiry.content,
  };
};

// 문의 목록 응답 변환
export const toInquiryListResponseDto = (
  list: InquiryWithRelations[],
  totalCount: number,
): InquiryListResponseDto => {
  return {
    list: list.map(toInquiryListItemDto),
    totalCount,
  };
};

// Reply 변환
const toInquiryReplyDto = (
  reply: InquiryReply & { user: { id: string; name: string } | null },
): InquiryReplyDto => {
  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    user: {
      id: reply.user!.id,
      name: reply.user!.name,
    },
  };
};

// 문의 상세 변환
export const toInquiryDetailDto = (inquiry: InquiryDetail): InquiryDetailDto => {
  return {
    id: inquiry.id,
    userId: inquiry.userId ?? '',
    productId: inquiry.productId ?? '',
    title: inquiry.title,
    content: inquiry.content,
    status: inquiry.status,
    isSecret: inquiry.isSecret,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
    user: {
      name: inquiry.user!.name,
    },
    ...(inquiry.reply ? { reply: toInquiryReplyDto(inquiry.reply) } : {}),
  };
};

// 문의 단순 변환 (수정/삭제 응답)
export const toInquiryDto = (inquiry: Inquiry): InquiryDto => {
  return {
    id: inquiry.id,
    userId: inquiry.userId ?? '',
    productId: inquiry.productId ?? '',
    title: inquiry.title,
    content: inquiry.content,
    status: inquiry.status,
    isSecret: inquiry.isSecret,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
};

// 답변 변환
export const toReplyDto = (reply: ReplyWithUser): ReplyDto => {
  return {
    id: reply.id,
    inquiryId: reply.inquiryId ?? '',
    userId: reply.userId ?? '',
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    user: {
      id: reply.user!.id,
      name: reply.user!.name,
    },
  };
};
