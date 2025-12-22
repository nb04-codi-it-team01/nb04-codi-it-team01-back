import { Prisma } from '@prisma/client';

export const reviewDetailInclude = {
  user: true,
  orderItem: {
    include: {
      product: true,
      size: true,
      order: true,
    },
  },
} satisfies Prisma.ReviewInclude;

export type ReviewDetailType = Prisma.ReviewGetPayload<{
  include: typeof reviewDetailInclude;
}>;
