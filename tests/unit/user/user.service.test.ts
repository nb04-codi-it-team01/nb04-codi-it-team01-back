import { UserService } from '../../../src/features/user/user.service';
import { UserRepository } from '../../../src/features/user/user.repository';
import { AppError } from '../../../src/shared/middleware/error-handler';
import type { CreateUserBody, UpdateUserBody } from '../../../src/features/user/user.schema';
import { UserType } from '@prisma/client';
import bcrypt from 'bcrypt';

// 의존성 모킹
jest.mock('../../../src/features/user/user.repository');
jest.mock('bcrypt');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // 각 테스트 전에 모든 mock 초기화
    jest.clearAllMocks();

    // 모킹된 repository 인스턴스 생성
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    const createUserBody: CreateUserBody = {
      name: '테스트유저',
      email: 'test@example.com',
      password: 'password123',
      type: UserType.BUYER,
    };

    const mockUser = {
      id: 'user-123',
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_password',
      type: UserType.BUYER,
      points: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      image:
        'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/1749477485230-user_default.png',
      gradeId: null,
      refreshToken: null,
      grade: null,
      totalAmount: 0,
    };

    it('이메일이 중복되지 않으면 회원가입 성공', async () => {
      // Mock 설정
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      // 회원가입 메서드 호출
      const result = await userService.createUser(createUserBody);

      // 올바른 순서로 메서드가 호출되었는지 확인
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: '테스트유저',
        email: 'test@example.com',
        password: 'hashed_password',
        type: UserType.BUYER,
      });

      // 반환값이 예상과 일치하는지 확인
      expect(result).toEqual({
        id: 'user-123',
        name: '테스트유저',
        email: 'test@example.com',
        type: UserType.BUYER,
        points: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        image:
          'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/1749477485230-user_default.png',
        grade: null,
      });
    });

    it('이메일이 중복되면 409 에러 발생', async () => {
      // 이미 존재하는 유저 설정
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // 에러가 발생하는지 확인
      await expect(userService.createUser(createUserBody)).rejects.toThrow(
        new AppError(409, '이미 존재하는 유저입니다.', 'ConFlict'),
      );

      // 이메일 체크는 했지만 생성은 하지 않았는지 확인
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getMyInfo', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_password',
      type: UserType.BUYER,
      points: 100,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      image: 'http://example.com/image.jpg',
      gradeId: 'grade-123',
      refreshToken: null,
      totalAmount: 50000,
      grade: {
        id: 'grade-123',
        name: 'BRONZE',
        rate: 0,
        minAmount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    };

    it('유저 ID로 정보 조회 성공', async () => {
      // Mock 설정
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // 내 정보 조회 메서드 호출
      const result = await userService.getMyInfo(userId);

      // Repository 메서드가 올바르게 호출되었는지 확인
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);

      // 반환값이 예상과 일치하는지 확인 (password는 제외됨)
      expect(result).toEqual({
        id: userId,
        name: '테스트유저',
        email: 'test@example.com',
        type: UserType.BUYER,
        points: 100,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        image: 'http://example.com/image.jpg',
        grade: {
          id: 'grade-123',
          name: 'BRONZE',
          rate: 0,
          minAmount: 0,
        },
      });
    });

    it('유저가 존재하지 않으면 404 에러 발생', async () => {
      // 유저를 찾을 수 없도록 설정
      mockUserRepository.findById.mockResolvedValue(null);

      // 404 에러가 발생하는지 확인
      await expect(userService.getMyInfo(userId)).rejects.toThrow(
        new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found'),
      );

      // Repository 메서드가 호출되었는지 확인
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateMyInfo', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_old_password',
      type: UserType.BUYER,
      points: 100,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      image: 'http://example.com/old-image.jpg',
      gradeId: null,
      refreshToken: null,
      grade: null,
      totalAmount: 0,
    };

    const updateBody: UpdateUserBody = {
      name: '변경된이름',
      password: 'newpassword123',
      currentPassword: 'oldpassword123',
      image: 'http://example.com/new-image.jpg',
    };

    it('현재 비밀번호가 맞으면 정보 수정 성공', async () => {
      // Mock 설정
      const updatedUser = {
        ...mockUser,
        name: '변경된이름',
        password: 'hashed_new_password',
        image: 'http://example.com/new-image.jpg',
        refreshToken: null,
        totalAmount: 0,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // 정보 수정 메서드 호출
      const result = await userService.updateMyInfo(userId, updateBody);

      // 올바른 순서로 메서드가 호출되었는지 확인
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword123', 'hashed_old_password');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        name: '변경된이름',
        password: 'hashed_new_password',
        image: 'http://example.com/new-image.jpg',
      });

      // 반환값 확인
      expect(result.name).toBe('변경된이름');
    });

    it('현재 비밀번호가 틀리면 401 에러 발생', async () => {
      // 비밀번호 검증 실패 설정
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // 401 에러가 발생하는지 확인
      await expect(userService.updateMyInfo(userId, updateBody)).rejects.toThrow(
        new AppError(401, '비밀번호가 일치하지 않습니다.', 'Unauthorized'),
      );

      // 비밀번호 검증은 했지만 업데이트는 하지 않았는지 확인
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword123', 'hashed_old_password');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('유저가 존재하지 않으면 404 에러 발생', async () => {
      // 유저를 찾을 수 없도록 설정
      mockUserRepository.findById.mockResolvedValue(null);

      // 404 에러가 발생하는지 확인
      await expect(userService.updateMyInfo(userId, updateBody)).rejects.toThrow(
        new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found'),
      );

      // 업데이트는 하지 않았는지 확인
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('비밀번호를 변경하지 않으면 해싱하지 않음', async () => {
      // 비밀번호 없이 이름만 변경
      const updateBodyWithoutPassword: UpdateUserBody = {
        name: '변경된이름',
        currentPassword: 'oldpassword123',
      };

      const updatedUser = {
        ...mockUser,
        name: '변경된이름',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // 정보 수정 메서드 호출
      await userService.updateMyInfo(userId, updateBodyWithoutPassword);

      // 현재 비밀번호는 검증했지만 새 비밀번호 해싱은 하지 않았는지 확인
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword123', 'hashed_old_password');
      expect(bcrypt.hash).not.toHaveBeenCalled();

      // 이름만 업데이트했는지 확인
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        name: '변경된이름',
      });
    });

    it('현재 비밀번호가 누락되면 에러 발생', async () => {
      const invalidBody = {
        name: '변경된이름',
      } as UpdateUserBody;

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // 400 에러가 발생하는지 확인
      await expect(userService.updateMyInfo(userId, invalidBody)).rejects.toThrow(
        new AppError(400, '현재 비밀번호는 필수입니다.'),
      );

      // 비밀번호 검증도 하지 않고 업데이트도 하지 않았는지 확인
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getMyLikes', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_password',
      type: UserType.BUYER,
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      image:
        'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/1749477485230-user_default.png',
      gradeId: null,
      refreshToken: null,
      grade: null,
      totalAmount: 0,
    };

    const mockLikes = [
      {
        userId: userId,
        storeId: 'store-1',
        createdAt: new Date('2025-01-01'),
        store: {
          id: 'store-1',
          name: '테스트스토어1',
          userId: 'seller-1',
          address: '서울',
          detailAddress: '강남구',
          phoneNumber: '010-1234-5678',
          content: '테스트',
          image: 'http://example.com/store1.jpg',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      },
      {
        userId: userId,
        storeId: 'store-2',
        createdAt: new Date('2025-01-02'),
        store: {
          id: 'store-2',
          name: '테스트스토어2',
          userId: 'seller-2',
          address: '부산',
          detailAddress: '해운대구',
          phoneNumber: '010-9876-5432',
          content: '테스트2',
          image: 'http://example.com/store2.jpg',
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      },
    ];

    it('관심 스토어 목록 조회 성공', async () => {
      // Mock 설정
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findUserLikes.mockResolvedValue(mockLikes);

      // 관심 스토어 조회 메서드 호출
      const result = await userService.getMyLikes(userId);

      // Repository 메서드가 올바르게 호출되었는지 확인
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findUserLikes).toHaveBeenCalledWith(userId);

      // 반환값 확인
      expect(result).toHaveLength(2);
      expect(result[0]?.storeId).toBe('store-1');
      expect(result[0]?.store.name).toBe('테스트스토어1');
    });

    it('유저가 존재하지 않으면 404 에러 발생', async () => {
      // 유저를 찾을 수 없도록 설정
      mockUserRepository.findById.mockResolvedValue(null);

      // 404 에러가 발생하는지 확인
      await expect(userService.getMyLikes(userId)).rejects.toThrow(
        new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found'),
      );

      // 관심 스토어 조회는 하지 않았는지 확인
      expect(mockUserRepository.findUserLikes).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-123';
    const currentPassword = 'password123';
    const mockUser = {
      id: userId,
      name: '테스트유저',
      email: 'test@example.com',
      password: 'hashed_password',
      type: UserType.BUYER,
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      image:
        'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/1749477485230-user_default.png',
      gradeId: null,
      refreshToken: null,
      grade: null,
      totalAmount: 0,
    };

    it('유저 삭제 성공', async () => {
      // Mock 설정
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.delete.mockResolvedValue({
        id: userId,
        name: '테스트유저',
        email: 'test@example.com',
        password: 'hashed_password',
        type: UserType.BUYER,
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        image:
          'https://sprint-be-project.s3.ap-northeast-2.amazonaws.com/codiit/1749477485230-user_default.png',
        gradeId: null,
        refreshToken: null,
        totalAmount: 0,
      });

      // 유저 삭제 메서드 호출
      await userService.deleteUser(userId, currentPassword);

      // Repository 메서드가 올바르게 호출되었는지 확인
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'hashed_password');
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('비밀번호가 일치하지 않으면 401 에러 발생', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // 비밀번호 불일치 설정

      await expect(userService.deleteUser(userId, currentPassword)).rejects.toThrow(
        new AppError(401, '비밀번호가 일치하지 않습니다.', 'Unauthorized'),
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'hashed_password');
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('유저가 존재하지 않으면 404 에러 발생', async () => {
      // 유저를 찾을 수 없도록 설정
      mockUserRepository.findById.mockResolvedValue(null);

      // 404 에러가 발생하는지 확인
      await expect(userService.deleteUser(userId, currentPassword)).rejects.toThrow(
        new AppError(404, '유저를 찾을 수 없습니다.', 'Not Found'),
      );

      // 삭제는 하지 않았는지 확인
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});
