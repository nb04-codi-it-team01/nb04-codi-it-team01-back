import { Prisma } from '@prisma/client';
import type { Request } from 'express';

export type AuthedRequest = Request & {
  user: {
    id: string;
    // role?: 'SELLER' | 'BUYER'; 필요하면 추가
  };
};

export type ProductWithDetailRelations = Prisma.ProductGetPayload<{
  include: {
    store: true;
    categories: { include: { category: true } };
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
