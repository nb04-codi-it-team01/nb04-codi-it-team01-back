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
  reviews: ReviewDto[];
  inquiries: DetailInquiry[];
  category: CategoryResponse[];
  stocks: StocksResponse[];
};
