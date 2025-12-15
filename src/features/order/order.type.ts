import { Prisma } from '@prisma/client';

export type OrderItemWithRelations = Prisma.OrderItemGetPayload<{
  include: {
    product: {
      include: {
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
