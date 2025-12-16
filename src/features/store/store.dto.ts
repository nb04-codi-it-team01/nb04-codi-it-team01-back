export interface StoreResponseDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  address: string;
  detailAddress: string;
  phoneNumber: string;
  content: string;
  image: string;
  favoriteCount?: number;
}

export interface CreateStoreDto {
  name: string;
  address: string;
  detailAddress?: string;
  phoneNumber: string;
  content: string;
  image?: string;
}

export interface UpdateStoreDto {
  name?: string;
  address?: string;
  detailAddress?: string;
  phoneNumber?: string;
  content?: string;
  image?: string;
}

export interface MyStoreDetailDto extends StoreResponseDto {
  productCount: number;
  monthFavoriteCount: number;
  totalSoldCount: number;
}

export interface MyProductResponse {
  id: string;
  image?: string;
  name: string;
  price: number;
  stock: number;
  isDiscount: boolean;
  isSoldOut: boolean;
  createdAt: string;
}

export interface MyProductsListResponse {
  list: MyProductResponse[];
  totalCount: number;
}
