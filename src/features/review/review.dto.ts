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
}
export interface UpdateReviewDto {
  rating: number;
}
