export interface CartResponseDtoBase {
  id: string;
  buyerId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SizeDto {
  id: number;
  size: { en: string; ko: string };
  name: string;
}

export interface CartStockDto {
  id: string;
  productId: string;
  sizeId: number;
  quantity: number;
  size: SizeDto;
}

export interface CartStoreDto {
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
}

export interface CartProductBaseDto {
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
}

export interface CartProductDetailDto extends CartProductBaseDto {
  reviewsRating: number;
  categoryId: string;
  content: string;
  isSoldOut: boolean;
  store: CartStoreDto;
  stocks: CartStockDto[];
}

export interface CartItemResponseDto {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: CartProductDetailDto;
}

export interface CartResponseDto {
  id: string;
  buyerId: string;
  createdAt: string;
  updatedAt: string;
  items: CartItemResponseDto[];
}

export interface UpdateCartDto {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemDetailDto {
  id: string;
  cartId: string;
  productId: string;
  sizeId: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: CartProductBaseDto;
  cart: CartResponseDtoBase;
}
