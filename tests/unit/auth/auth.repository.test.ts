import { AuthRepository } from '../../../src/features/auth/auth.repository';
import prisma from '../../../src/lib/prisma';

// Prisma Mocking
jest.mock('../../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe('AuthRepository', () => {
  let authRepository: AuthRepository;

  beforeEach(() => {
    authRepository = new AuthRepository();
    jest.clearAllMocks();
  });

  describe('findByEmailWithGrade', () => {
    it('이메일로 사용자를 조회할 때 grade를 포함해서 찾아야 한다', async () => {
      const email = 'test@example.com';
      // prisma가 반환할 가짜 값 설정
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-id', email });

      await authRepository.findByEmailWithGrade(email);

      // prisma.user.findUnique가 올바른 옵션으로 호출되었는지 확인
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { grade: true },
      });
    });
  });

  describe('saveRefreshToken', () => {
    it('DB에 리프레시 토큰을 업데이트', async () => {
      const userId = 'user-1';
      const refreshToken = 'refresh-token-123';

      await authRepository.saveRefreshToken(userId, refreshToken);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken },
      });
    });
  });

  describe('clearRefreshToken', () => {
    it('DB에서 리프레시 토큰을 null로 변경', async () => {
      const userId = 'user-1';

      await authRepository.clearRefreshToken(userId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: null },
      });
    });
  });
});
