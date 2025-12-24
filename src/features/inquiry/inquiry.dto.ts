// User 응답 (간소화)
export type InquiryUserDto = {
  id: string;
  name: string;
};

// Reply User 응답
export type ReplyUserDto = {
  id: string;
  name: string;
};

// Store 응답 (간소화)
export type InquiryStoreDto = {
  id: string;
  name: string;
};

// Product 응답 (간소화)
export type InquiryProductDto = {
  id: string;
  name: string;
  image: string;
  store: InquiryStoreDto;
};

// 답변 응답
export type InquiryReplyDto = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: ReplyUserDto;
};

// 문의 목록 아이템 응답
export type InquiryListItemDto = {
  id: string;
  title: string;
  isSecret: boolean;
  status: string;
  product: InquiryProductDto;
  user: InquiryUserDto;
  createdAt: string;
  content: string;
};

// 문의 목록 응답
export type InquiryListResponseDto = {
  list: InquiryListItemDto[];
  totalCount: number;
};

// 문의 상세 응답
export type InquiryDetailDto = {
  id: string;
  userId: string;
  productId: string;
  title: string;
  content: string;
  status: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
  user: InquiryUserDto;
  reply?: InquiryReplyDto;
};

// 문의 수정/삭제 응답
export type InquiryDto = {
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

// 답변 생성/수정 응답
export type ReplyDto = {
  id: string;
  inquiryId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: ReplyUserDto;
};
