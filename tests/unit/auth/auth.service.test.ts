import { AuthService } from '../../../src/features/auth/auth.service';
import { AuthRepository } from '../../../src/features/auth/auth.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import bcrypt from 'bcrypt';
import * as tokens from '../../../src/lib/tokens';

// Mocking
jest.mock('bcrypt');
jest.mock('../../../src/lib/tokens');

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    authRepository = {
      findByEmailWithGrade: jest.fn(),
      findUserById: jest.fn(),
      saveRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    authService = new AuthService(authRepository);
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      password: 'hashed_password',
      name: 'Tester',
      type: 'USER',
      points: 0,
      image: null,
      grade: { id: 'grade-1', name: 'Basic', rate: 1, minAmount: 0 },
    };

    it('성공 시: 토큰과 사용자 정보를 반환', async () => {
      // Unit Test에서는 Prisma의 전체 스키마(createdAt 등)를 맞추기보다 로직 검증에 집중함
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authRepository.findByEmailWithGrade.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // 비번 일치 가정
      (tokens.generateToken as jest.Mock).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login('test@test.com', 'password');

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty('password'); // password 제거 확인
      expect(authRepository.saveRefreshToken).toHaveBeenCalledWith(mockUser.id, 'refresh-token');
    });

    it('실패 시: 사용자가 없으면 404 에러', async () => {
      authRepository.findByEmailWithGrade.mockResolvedValue(null);

      await expect(authService.login('wrong@email.com', 'pw')).rejects.toThrow(
        new AppError(404, '이메일 또는 비밀번호가 올바르지 않습니다.'),
      );
    });

    it('실패 시: 비밀번호가 틀리면 400 에러', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authRepository.findByEmailWithGrade.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // 비번 불일치

      await expect(authService.login('test@test.com', 'wrong-pw')).rejects.toThrow(
        new AppError(400, '이메일 또는 비밀번호가 올바르지 않습니다.'),
      );
    });
  });

  describe('refreshTokens', () => {
    it('성공 시: 새로운 토큰을 발급', async () => {
      const mockUser = { id: 'user-1', refreshToken: 'valid-refresh-token' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authRepository.findUserById.mockResolvedValue(mockUser as any);
      (tokens.generateToken as jest.Mock).mockReturnValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await authService.refreshTokens('user-1', 'valid-refresh-token');

      expect(result.accessToken).toBe('new-access');
      expect(authRepository.saveRefreshToken).toHaveBeenCalledWith('user-1', 'new-refresh');
    });

    it('실패 시: DB 토큰과 클라이언트 토큰이 다르면 401 에러', async () => {
      const mockUser = { id: 'user-1', refreshToken: 'old-token' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authRepository.findUserById.mockResolvedValue(mockUser as any);

      await expect(authService.refreshTokens('user-1', 'hacking-token')).rejects.toThrow(
        new AppError(401, '인증이 필요합니다'),
      );
    });

    it('실패 시: 사용자가 없거나 DB에 토큰이 없으면 401 에러', async () => {
      authRepository.findUserById.mockResolvedValue(null); // 사용자 없음

      await expect(authService.refreshTokens('user-1', 'token')).rejects.toThrow(
        new AppError(401, '인증이 필요합니다'),
      );
    });
  });

  describe('logout', () => {
    it('로그아웃 시 리프레시 토큰을 삭제', async () => {
      await authService.logout('user-1');
      expect(authRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
    });
  });
});
