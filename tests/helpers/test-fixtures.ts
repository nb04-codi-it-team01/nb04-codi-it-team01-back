import { UserType } from '@prisma/client';

/**
 * 테스트 사용자 데이터
 */
export const testUsers = {
  buyer: {
    name: '테스트구매자',
    email: 'buyer@test.com',
    password: 'Test1234!',
    type: UserType.BUYER,
  },
  seller: {
    name: '테스트판매자',
    email: 'seller@test.com',
    password: 'Test1234!',
    type: UserType.SELLER,
  },
  anotherBuyer: {
    name: '다른구매자',
    email: 'buyer2@test.com',
    password: 'Test1234!',
    type: UserType.BUYER,
  },
};

/**
 * 업데이트할 사용자 정보
 */
export const updateUserData = {
  name: '변경된이름',
  password: 'NewPass1234!',
  currentPassword: 'Test1234!',
};
