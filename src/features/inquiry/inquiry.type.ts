import { Prisma } from '@prisma/client';

// 문의 목록 조회용 (product, user 포함)
export const inquiryWithRelationsInclude = {
  product: {
    include: {
      store: true,
    },
  },
  user: true,
} satisfies Prisma.InquiryInclude;

export type InquiryWithRelations = Prisma.InquiryGetPayload<{
  include: typeof inquiryWithRelationsInclude;
}>;

// 문의 상세 조회용 (reply 포함)
export const inquiryDetailInclude = {
  user: true,
  reply: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.InquiryInclude;

export type InquiryDetail = Prisma.InquiryGetPayload<{
  include: typeof inquiryDetailInclude;
}>;

// Reply with user
export const replyWithUserInclude = {
  user: true,
} satisfies Prisma.InquiryReplyInclude;

export type ReplyWithUser = Prisma.InquiryReplyGetPayload<{
  include: typeof replyWithUserInclude;
}>;
