export type StocksResponse = {
  id: string;
  productId: string;
  quantity: number;
  size?: {
    id: number;
    name: string;
  };
};

export type CategoryResponse = {
  name: string;
  id: string;
};

export type StocksDto = {
  sizeId: number;
  quantity: number;
};

export type DetailInquiry = {
  id: string;
  title: string;
  content: string;
  status: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
  reply?: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
    };
  };
};

export type ProductDto = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  image: string;
  discountRate: number;
  discountStartTime: string;
  discountEndTime: string;
  createdAt: string;
  updatedAt: string;
  store: StoreDto;
  stocks: StocksDto[];
};

export type StoreDto = {
  id: string;
  userId: string;
  name: string;
  address: string;
  phoneNumber: string;
  content: string;
  image: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductDto = {
  name: string;
  price: number;
  content?: string;
  image?: string;
  discountRate?: number;
  discountStartTime?: string;
  discountEndTime?: string;
  categoryName: string;
  stocks: StocksResponse[];
};

export type ReviewDto = {
  rate1Length: number;
  rate2Length: number;
  rate3Length: number;
  rate4Length: number;
  rate5Length: number;
  sumScore: number;
};

export type DetailProductResponse = {
  id: string;
  name: string;
  image: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  reviewsRating: number;
  storeId: string;
  storeName: string;
  price: number;
  discountPrice: number;
  discountRate: number;
  discountStartTime?: string;
  discountEndTime?: string;
  reviewsCount: number;
  reviews: ReviewDto;
  inquiries: DetailInquiry[];
  category: CategoryResponse[];
  stocks: StocksResponse[];
};

export type UpdateProductDto = {
  id: string;
  name?: string;
  price?: number;
  content?: string;
  image?: string;
  discountRate?: number;
  discountStartTime?: string;
  discountEndTime?: string;
  categoryName?: string;
  isSoldOut?: boolean;
  stocks: StocksDto[];
};

export type ProductListDto = {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  image: string;
  price: number;
  discountPrice: number;
  discountRate: number;
  discountStartTime?: string;
  discountEndTime?: string;
  reviewsCount: number;
  reviewsRating: number;
  createdAt: string;
  updatedAt: string;
  sales: number;
  isSoldOut: boolean;
};

export type ProductListResponse = {
  list: ProductListDto[];
  totalCount: number;
};

export type ProductInfo = {
  id: string;
  name: string;
  price: number;
};

export type InquiryResponse = {
  id: string;
  userId: string;
  productId: string;
  title: string;
  content: string;
  status: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface InquiriesResponse extends InquiryResponse {
  user: {
    name: string;
  };
  reply?: InquiryReply;
}

export type InquiryReply = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
  };
};
