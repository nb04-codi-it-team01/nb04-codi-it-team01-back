export type OrderReviewDto = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
};

export type OrderProductDto = {
  name: string;
  image: string;
  reviews: (OrderReviewDto | null)[];
};

export type OrderItemDto = {
  id: string;
  price: number;
  quantity: number;
  productId: string;
  product: OrderProductDto | null;
  size: SizeDto | null;
  isReviewed: boolean;
};

export type SizeDto = {
  id: number;
  size: SizeInfoDto | null;
};

export type SizeInfoDto = {
  en: string;
  ko: string;
};

export type PaymentDto = {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderId: string;
};

export type OrderResponseDto = {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  subtotal: number;
  totalQuantity: number;
  usePoint: number;
  createdAt: string;
  orderItems: OrderItemDto[];
  payment: PaymentDto | null;
};

export type OrderPaginationMetaDto = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type OrderPaginatedResponseDto = {
  data: OrderResponseDto[];
  meta: OrderPaginationMetaDto;
};

export type CreateOrderItemDto = {
  productId: string;
  sizeId: number;
  quantity: number;
};

export type CreateOrderDto = {
  name: string;
  phone: string;
  address: string;
  orderItems: CreateOrderItemDto[];
  usePoint: number;
};

export type UpdateOrderDto = {
  name: string;
  phone: string;
  address: string;
  orderItems: CreateOrderItemDto[];
  usePoint: number;
};
