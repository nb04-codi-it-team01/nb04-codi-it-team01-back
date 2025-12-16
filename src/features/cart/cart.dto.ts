export interface CartResponseDtoBase {
  id: string;
  buyerId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SizeDto {
  en: string;
  ko: string;
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
}

export interface CartProductDto {
  id: string;
  storeId: string;
  name: string;
  price: number;
  image: string;
  discountRate: number;
  discountStartTime: string | null;
  discountEndTime: string | null;
  createdAt: string;
  updatedAt: string;
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
  product: CartProductDto;
}

export interface CartResponseDto extends CartResponseDtoBase {
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
