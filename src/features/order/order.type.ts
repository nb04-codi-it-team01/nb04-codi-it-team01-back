import { Prisma } from '@prisma/client';

export const orderItemWithRelationsInclude = {
  product: {
    include: {
      store: true,
      stocks: {
        include: {
          size: true,
        },
      },
    },
  },
  size: true,
  review: true,
};

export type OrderItemWithRelations = Prisma.OrderItemGetPayload<{
  include: typeof orderItemWithRelationsInclude;
}>;

export const orderWithRelationsInclude = {
  orderItems: {
    include: orderItemWithRelationsInclude,
  },
  payment: true,
};

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderWithRelationsInclude;
}>;
