import { UserRepository } from '../../../src/features/user/user.repository';
import prisma from '../../../src/lib/prisma';
import { UserType } from '@prisma/client';

// Prisma Mocking
jest.mock('../../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  grade: {
    findFirst: jest.fn(),
  },
  userLike: {
    findMany: jest.fn(),
  },
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 조회할 때 grade를 포함해서 찾아야 한다', async () => {
      const email = 'test@example.com';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-id', email });

      await userRepository.findByEmail(email);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { grade: true },
      });
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 조회할 때 grade를 포함해서 찾아야 한다', async () => {
      const userId = 'user-1';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId });

      await userRepository.findById(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { grade: true },
      });
    });
  });

  describe('create', () => {
    const userData = {
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_password',
      type: UserType.BUYER,
    };

    it('기본 이미지와 함께 사용자를 생성', async () => {
      const mockGrade = { id: 'grade-1', minAmount: 0 };
      (prisma.grade.findFirst as jest.Mock).mockResolvedValue(mockGrade);

      await userRepository.create(userData);

      expect(prisma.grade.findFirst).toHaveBeenCalledWith({
        orderBy: { minAmount: 'asc' },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          type: userData.type,
          image:
            'https://codiit-team1-images.s3.ap-northeast-2.amazonaws.com/upload/default-profile.png',
          gradeId: 'grade-1',
        },
        include: { grade: true },
      });
    });

    it('커스텀 이미지와 함께 사용자를 생성', async () => {
      const mockGrade = { id: 'grade-1', minAmount: 0 };
      const customImage = 'http://example.com/custom-image.jpg';
      (prisma.grade.findFirst as jest.Mock).mockResolvedValue(mockGrade);

      await userRepository.create({ ...userData, image: customImage });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          type: userData.type,
          image: customImage,
          gradeId: 'grade-1',
        },
        include: { grade: true },
      });
    });
  });

  describe('update', () => {
    it('사용자 정보를 업데이트', async () => {
      const userId = 'user-1';
      const updateData = {
        name: '변경된이름',
        password: 'new_hashed_password',
        image: 'http://example.com/new-image.jpg',
      };

      await userRepository.update(userId, updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: { grade: true },
      });
    });

    it('일부 필드만 업데이트', async () => {
      const userId = 'user-1';
      const updateData = { name: '변경된이름' };

      await userRepository.update(userId, updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: { grade: true },
      });
    });
  });

  describe('delete', () => {
    it('사용자를 삭제', async () => {
      const userId = 'user-1';

      await userRepository.delete(userId);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('findUserLikes', () => {
    it('사용자의 관심 스토어 목록을 조회할 때 store를 포함해서 찾아야 한다', async () => {
      const userId = 'user-1';
      (prisma.userLike.findMany as jest.Mock).mockResolvedValue([]);

      await userRepository.findUserLikes(userId);

      expect(prisma.userLike.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { store: true },
      });
    });
  });
});
