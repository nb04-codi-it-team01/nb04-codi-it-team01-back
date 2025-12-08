import { UserRepository } from './user.repository';
import type { CreateUserBody, UpdateUserBody } from './user.schema';
import type { UserResponse, UserLikeResponse } from './user.dto';
import { AppError } from '../../shared/middleware/error-handler';
import type { User, Grade, UserLike, Store } from '@prisma/client';

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  /**
   * 회원가입
   */
  async createUser(body: CreateUserBody): Promise<UserResponse> {
    const { name, email, password, type } = body;

    // 이메일 중복 체크
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, '이미 존재하는 유저입니다.', 'ConFlict');
    }

    // TODO: 비밀번호 해싱 (bcrypt 사용 권장)
    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      name,
      email,
      password, // TODO: hashedPassword로 변경
      type,
    });

    return this.toUserResponse(user);
  }

  /**
   * 내 정보 조회
   */
  async getMyInfo(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found');
    }

    return this.toUserResponse(user);
  }

  /**
   * 내 정보 수정
   */
  async updateMyInfo(userId: string, body: UpdateUserBody): Promise<UserResponse> {
    const { name, password, currentPassword, image } = body;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found');
    }

    // 현재 비밀번호 확인
    // TODO: bcrypt로 비밀번호 검증
    // const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    // if (!isPasswordValid) {
    //   throw new AppError(401, '현재 비밀번호가 올바르지 않습니다.', 'Unauthorized');
    // }

    if (currentPassword !== user.password) {
      throw new AppError(401, '현재 비밀번호가 올바르지 않습니다.', 'Unauthorized');
    }

    const updateData: {
      name?: string;
      password?: string;
      image?: string;
    } = {};

    if (name) updateData.name = name;
    if (password) updateData.password = password; // TODO: 해싱 필요
    if (image) updateData.image = image;

    const updatedUser = await this.userRepository.update(userId, updateData);

    return this.toUserResponse(updatedUser);
  }

  /**
   * 관심 스토어 조회
   */
  async getMyLikes(userId: string): Promise<UserLikeResponse[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found');
    }

    const likes = await this.userRepository.findUserLikes(userId);

    return likes.map((like) => this.toUserLikeResponse(like));
  }

  /**
   * 회원 탈퇴
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found');
    }

    await this.userRepository.delete(userId);
  }

  /**
   * User → UserResponse 변환
   */
  private toUserResponse(
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
  private toUserLikeResponse(
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
