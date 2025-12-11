export interface StoreResponseDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  address: string;
  detailAddress: string | null;
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
