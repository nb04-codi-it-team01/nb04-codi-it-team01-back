import { CartItem } from '@prisma/client';
import {
  CartWithItems,
  CartItemWithProduct,
  CartWithSimpleItems,
  CartItemDetail,
} from './cart.type';
import {
  CartItemDetailDto,
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
  return {
    id: cart.id,
    buyerId: cart.buyerId,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    items: cart.items.map(mapCartItem),
  };
};

export const mapCartItem = (item: CartItemWithProduct): CartItemResponseDto => {
  const p = item.product!;
  const store = p.store!;

  const reviewsRating =
    p.reviews.length > 0
      ? p.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
        p.reviews.length
      : 0;

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
      reviewsRating: Number(reviewsRating.toFixed(1)),
      // Swagger 스펙에는 categoryId가 필요하지만
      // Product 모델에는 categoryId 컬럼이 없어 categoryName을 임시로 사용
      categoryId: p.categoryName,
      content: p.content ?? '',
      isSoldOut: p.isSoldOut,
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
        detailAddress: store.detailAddress ?? '',
      },
      stocks: p.stocks.map((s) => ({
        id: s.id,
        productId: s.productId!,
        sizeId: s.sizeId,
        quantity: s.quantity,
        size: {
          id: s.size.id,
          size: {
            en: s.size.en,
            ko: s.size.ko,
          },
          // Swagger 응답 스펙에 name 필드가 필요하지만
          // 실제 Size 모델에는 name 컬럼이 없어 임시로 en 값을 사용
          name: `${s.size.en}`,
        },
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

export const toCartItemDetailResponse = (item: CartItemDetail): CartItemDetailDto => {
  const p = item.product!;
  const cart = item.cart;
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

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
      storeId: p.storeId ?? '',
      name: p.name,
      price: p.price,
      image: p.image ?? '',
      discountRate: p.discountRate,
      discountStartTime: p.discountStartTime?.toISOString() ?? null,
      discountEndTime: p.discountEndTime?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    },
    cart: {
      id: cart.id,
      buyerId: cart.buyerId,
      quantity: quantity,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    },
  };
};
