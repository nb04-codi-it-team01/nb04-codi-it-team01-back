import type { User, Grade, UserLike, Store } from '@prisma/client';
import type { UserResponse, UserLikeResponse } from './user.dto';

export class UserMapper {
  /**
   * User → UserResponse 변환
   */
  static toUserResponse(
    user: User & {
      grade: Grade | null;
    },
  ): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      points: user.points,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      image: user.image,
      grade: user.grade
        ? {
            id: user.grade.id,
            name: user.grade.name,
            rate: user.grade.rate,
            minAmount: user.grade.minAmount,
          }
        : null,
    };
  }

  /**
   * UserLike → UserLikeResponse 변환
   */
  static toUserLikeResponse(
    like: UserLike & {
      store: Store;
    },
  ): UserLikeResponse {
    return {
      storeId: like.storeId,
      userId: like.userId,
      store: {
        id: like.store.id,
        name: like.store.name,
        createdAt: like.store.createdAt.toISOString(),
        updatedAt: like.store.updatedAt.toISOString(),
        userId: like.store.userId,
        address: like.store.address,
        detailAddress: like.store.detailAddress,
        phoneNumber: like.store.phoneNumber,
        content: like.store.content,
        image: like.store.image,
      },
    };
  }
}
