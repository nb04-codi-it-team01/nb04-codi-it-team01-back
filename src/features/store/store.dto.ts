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
export interface MyStoreDetailDto extends StoreResponseDto {
  productCount: number;
  monthFavoriteCount: number;
  totalSoldCount: number;
}

export type CreateStoreDto = {
  name: string;
  address: string;
  detailAddress?: string;
  phoneNumber: string;
  content: string;
  image?: string;
};

export type UpdateStoreDto = {
  name?: string;
  address?: string;
  detailAddress?: string;
  phoneNumber?: string;
  content?: string;
  image?: string;
};

export type MyProductResponse = {
  id: string;
  image?: string;
  name: string;
  price: number;
  stock: number;
  isDiscount: boolean;
  isSoldOut: boolean;
  createdAt: string;
};

export type MyProductsListResponse = {
  list: MyProductResponse[];
  totalCount: number;
};
