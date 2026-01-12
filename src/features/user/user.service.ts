import { UserRepository } from './user.repository';
import type { CreateUserBody, UpdateUserBody } from './user.schema';
import type { UserResponse, UserLikeResponse } from './user.dto';
import { UserMapper } from './user.mapper';
import { AppError } from '../../shared/middleware/error-handler';
import bcrypt from 'bcrypt';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * 유저 조회 헬퍼 메서드
   */
  private async getUserOrThrow(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found');
    }
    return user;
  }

  /**
   * 비밀번호 검증 헬퍼 메서드
   */
  private async verifyPasswordOrThrow(plainPassword: string, hashedPassword: string) {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isMatch) {
      throw new AppError(400, '비밀번호가 일치하지 않습니다.', 'Bad Request');
    }
  }

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

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      type,
    });

    return UserMapper.toUserResponse(user);
  }

  /**
   * 내 정보 조회
   */
  async getMyInfo(userId: string): Promise<UserResponse> {
    const user = await this.getUserOrThrow(userId);
    return UserMapper.toUserResponse(user);
  }

  /**
   * 내 정보 수정
   */
  async updateMyInfo(userId: string, body: UpdateUserBody): Promise<UserResponse> {
    const { name, password, currentPassword, image } = body;

    const user = await this.getUserOrThrow(userId);

    if (!currentPassword) {
      throw new AppError(400, '현재 비밀번호는 필수입니다.');
    }

    await this.verifyPasswordOrThrow(currentPassword, user.password);

    const updateData: {
      name?: string;
      password?: string;
      image?: string;
    } = {};

    if (name) updateData.name = name;
    if (password) {
      // 새 비밀번호 해싱
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (image) updateData.image = image;

    const updatedUser = await this.userRepository.update(userId, updateData);

    return UserMapper.toUserResponse(updatedUser);
  }

  /**
   * 관심 스토어 조회
   */
  async getMyLikes(userId: string): Promise<UserLikeResponse[]> {
    await this.getUserOrThrow(userId);

    const likes = await this.userRepository.findUserLikes(userId);
    return likes.map((like) => UserMapper.toUserLikeResponse(like));
  }

  /**
   * 회원 탈퇴
   */
  async deleteUser(userId: string, currentPassword: string): Promise<void> {
    const user = await this.getUserOrThrow(userId);
    await this.verifyPasswordOrThrow(currentPassword, user.password);
    await this.userRepository.delete(userId);
  }
}
