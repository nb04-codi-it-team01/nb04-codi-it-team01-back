export type CreateReviewDto = {
  rating: number;
  content: string;
  orderItemId: string;
};

export type ReviewResponseDto = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  content: string;
  createdAt: Date;
  user: {
    name: string;
  };
};

export type UpdateReviewDto = {
  rating: number;
};
