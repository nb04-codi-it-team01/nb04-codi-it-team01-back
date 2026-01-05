import { generateToken } from '../../lib/tokens';
import { AppError } from '../../shared/middleware/error-handler';
import bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    type: string;
    points: number;
    image: string | null;
    grade: {
      id: string;
      name: string;
      rate: number;
      minAmount: number;
    } | null;
  };
  accessToken: string;
  refreshToken: string;
}
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private toSafeUser<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const INVALID_CREDENTIALS_MSG = '이메일 또는 비밀번호가 올바르지 않습니다.';

    const user = await this.authRepository.findByEmailWithGrade(email);
    if (!user) {
      throw new AppError(404, INVALID_CREDENTIALS_MSG);
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      throw new AppError(400, INVALID_CREDENTIALS_MSG);
    }

    const { accessToken, refreshToken } = generateToken(user.id);
    await this.authRepository.saveRefreshToken(user.id, refreshToken);
    const safeUser = this.toSafeUser(user);

    return {
      user: {
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        type: safeUser.type,
        points: safeUser.points,
        image: safeUser.image,
        grade: safeUser.grade
          ? {
              id: safeUser.grade.id,
              name: safeUser.grade.name,
              rate: safeUser.grade.rate,
              minAmount: safeUser.grade.minAmount,
            }
          : null,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.clearRefreshToken(userId);
  }

  async refreshTokens(userId: string, refreshTokenFromClient: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user || !user.refreshToken || user.refreshToken !== refreshTokenFromClient) {
      throw new AppError(401, '인증이 필요합니다');
    }

    const { accessToken, refreshToken } = generateToken(userId);
    await this.authRepository.saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }
}
