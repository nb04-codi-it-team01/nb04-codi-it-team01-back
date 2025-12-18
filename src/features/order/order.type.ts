import { Prisma } from '@prisma/client';

export type OrderItemWithRelations = Prisma.OrderItemGetPayload<{
  include: {
    product: {
      include: {
        reviews: true;
        store: true;
        stocks: { include: { size: true } };
      };
    };
    size: true;
  };
}>;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: {
          include: {
            reviews: true;
            store: true;
            stocks: { include: { size: true } };
          };
        };
        size: true;
      };
    };
    payment: true;
  };
}>;
