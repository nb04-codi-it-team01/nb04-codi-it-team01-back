// User 응답 DTO (API 명세서 기준)
export type UserResponse = {
  id: string;
  name: string;
  email: string;
  type: string;
  points: number;
  createdAt: string;
  updatedAt: string;
  image: string;
  grade: GradeResponse | null;
};

export type GradeResponse = {
  id: string;
  name: string;
  rate: number;
  minAmount: number;
};

// 관심 스토어 응답
export type UserLikeResponse = {
  storeId: string;
  userId: string;
  store: StoreInLikeResponse;
};

export type StoreInLikeResponse = {
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
};
