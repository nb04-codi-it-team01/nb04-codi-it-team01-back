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

  // 현재 시간 기준 할인 가격 계산
  const now = new Date();
  const isDiscountActive =
    p.discountRate > 0 &&
    p.discountStartTime &&
    p.discountEndTime &&
    p.discountStartTime <= now &&
    now <= p.discountEndTime;

  const discountPrice = isDiscountActive
    ? Math.floor(p.price * (1 - p.discountRate / 100))
    : p.price;

  // 스토어가 삭제된 경우 대비
  const store = p.store;

  const reviewsRating =
    p.reviews && p.reviews.length > 0
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
      storeId: p.storeId ?? '',
      name: p.name,
      price: p.price,

      // 계산된 할인가 삽입
      discountPrice: discountPrice,

      image: p.image ?? '',
      discountRate: p.discountRate,
      discountStartTime: p.discountStartTime?.toISOString() || null,
      discountEndTime: p.discountEndTime?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      reviewsRating: Number(reviewsRating.toFixed(1)),
      categoryId: p.categoryName,
      content: p.content ?? '',
      isSoldOut: p.isSoldOut,

      // 스토어 정보 안전하게 매핑
      store: {
        id: store?.id ?? '',
        userId: store?.userId ?? '',
        name: store?.name ?? '삭제된 스토어',
        address: store?.address ?? '',
        phoneNumber: store?.phoneNumber ?? '',
        content: store?.content ?? '',
        image: store?.image ?? '',
        createdAt: store?.createdAt.toISOString() ?? new Date().toISOString(),
        updatedAt: store?.updatedAt.toISOString() ?? new Date().toISOString(),
        detailAddress: store?.detailAddress ?? '',
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
  const p = item.product; // ! 제거
  const cart = item.cart;
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (!p) {
    throw new Error('상품 정보를 찾을 수 없습니다.');
  }

  const now = new Date();
  const isDiscountActive =
    p.discountRate > 0 &&
    p.discountStartTime &&
    p.discountEndTime &&
    p.discountStartTime <= now &&
    now <= p.discountEndTime;

  const discountPrice = isDiscountActive
    ? Math.floor(p.price * (1 - p.discountRate / 100))
    : p.price;

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
      discountPrice: discountPrice,

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
