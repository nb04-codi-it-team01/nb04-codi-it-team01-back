export type UserType = 'BUYER' | 'SELLER';

export type AuthUser = {
  id: string;
  type: UserType;
};
