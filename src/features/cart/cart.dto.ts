export interface CartResponseDtoBase {
  id: string;
  buyerId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartProductDetailDto extends CartProductBaseDto {
  reviewsRating: number;
  categoryId: string;
  content: string;
  isSoldOut: boolean;
  store: CartStoreDto;
  stocks: CartStockDto[];
}

export type SizeDto = {
  id: number;
  size: { en: string; ko: string };
  name: string;
};

export type CartStockDto = {
  id: string;
  productId: string;
  sizeId: number;
  quantity: number;
  size: SizeDto;
};

export type CartStoreDto = {
  id: string;
  userId: string;
  name: string;
  address: string;
  phoneNumber: string;
  content: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  detailAddress: string;
};

export type CartProductBaseDto = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  image: string;
  discountRate: number;
  discountPrice: number;
  discountStartTime: string | null;
  discountEndTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CartItemResponseDto = {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: CartProductDetailDto;
};

export type CartResponseDto = {
  id: string;
  buyerId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItemResponseDto[];
};

export type UpdateCartDto = {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CartItemDetailDto = {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: CartProductBaseDto;
  cart: CartResponseDtoBase;
};
