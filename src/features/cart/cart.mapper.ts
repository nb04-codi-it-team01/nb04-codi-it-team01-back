import { Cart, CartItem } from '@prisma/client';
import { CartResponseDto } from './cart.dto';

type CartWithItems = Cart & { items: CartItem[] };

export const toCartResponseDto = (cart: CartWithItems): CartResponseDto => {
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    buyerId: cart.buyerId,
    quantity,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
};
