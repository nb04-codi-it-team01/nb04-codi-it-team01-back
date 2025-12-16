import { Prisma } from '@prisma/client';

export const cartWithItemsInclude = {
  items: {
    include: {
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
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof cartWithItemsInclude;
}>;

export type CartItemWithProduct = CartWithItems['items'][number];

export type CartWithSimpleItems = Prisma.CartGetPayload<{
  include: { items: true };
}>;
