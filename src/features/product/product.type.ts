import { Prisma } from '@prisma/client';

export type ProductWithDetailRelations = Prisma.ProductGetPayload<{
  include: {
    store: true;
    stocks: { include: { size: true } };
    reviews: true;
    inquiries: {
      include: {
        reply: {
          include: { user: true };
        };
      };
    };
  };
}>;
