export type CreateReviewDto = {
  rating: number;
  content: string;
  orderItemId: string;
};

export interface ReviewResponseDto {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  content: string;
  createdAt: Date;
  user: {
    name: string;
  };
}
export interface UpdateReviewDto {
  rating: number;
}

export type ReviewDetailResponseDto = {
  reviewId: string;
  productName: string;
  size: {
    en: string;
    ko: string;
  };
  price: number;
  quantity: number;
  rating: number;
  content: string;
  reviewer: string;
  reviewCreatedAt: string;
  purchasedAt: string;
};
