import { CartItem } from '@prisma/client';
import { CartWithItems, CartItemWithProduct, CartWithSimpleItems } from './cart.type';
import {
  CartItemResponseDto,
  CartResponseDto,
  CartResponseDtoBase,
  UpdateCartDto,
} from './cart.dto';

export const toCartResponseDto = (cart: CartWithSimpleItems): CartResponseDtoBase => {
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    buyerId: cart.buyerId,
    quantity,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
};

export const toCartResponseDtoWithItems = (cart: CartWithItems): CartResponseDto => {
  const quantity = cart.items
    .filter((item) => item.product !== null)
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    buyerId: cart.buyerId,
    quantity,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    items: cart.items.map(mapCartItem),
  };
};

export const mapCartItem = (item: CartItemWithProduct): CartItemResponseDto => {
  const p = item.product!;
  const store = p.store!;

  return {
    id: item.id,
    cartId: item.cartId,
    productId: item.productId,
    sizeId: item.sizeId,
    quantity: item.quantity,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    product: {
      id: p.id,
      storeId: p.storeId!,
      name: p.name,
      price: p.price,
      image: p.image ?? '',
      discountRate: p.discountRate,
      discountStartTime: p.discountStartTime?.toISOString() || null,
      discountEndTime: p.discountEndTime?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      store: {
        id: store.id,
        userId: store.userId,
        name: store.name,
        address: store.address,
        phoneNumber: store.phoneNumber,
        content: store.content,
        image: store.image,
        createdAt: store.createdAt.toISOString(),
        updatedAt: store.updatedAt.toISOString(),
      },
      stocks: p.stocks.map((s) => ({
        id: s.id,
        productId: s.productId!,
        sizeId: s.sizeId,
        quantity: s.quantity,
        size: { en: s.size.en, ko: s.size.ko },
      })),
    },
  };
};

export const toCartItemResponseDto = (item: CartItem): UpdateCartDto => {
  return {
    id: item.id,
    cartId: item.cartId,
    productId: item.productId,
    sizeId: item.sizeId,
    quantity: item.quantity,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
};
