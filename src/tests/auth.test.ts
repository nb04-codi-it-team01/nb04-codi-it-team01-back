import bcrypt from 'bcrypt';
import request from 'supertest';
import { mockRepository } from './mock/mock.method';
import { app } from '../app';
jest.mock('bcrypt', () => ({
  compare: jest.fn(async (_pw, _hash) => {
    return true;
  }),
  hash: jest.fn(async (pw) => `hashed ${pw}`),
}));

jest.mock('../lib/generate-token', () => ({
  __esModule: true,
  generateToken: jest.fn(() => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  })),
}));

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: mockRepository,
}));

import { describe, expect, beforeAll, beforeEach, it } from '@jest/globals';
import { AuthService } from '../features/auth/auth.service.js';
import { AuthController } from '../features/auth/auth.controller.js';
import { AuthRepository } from '../features/auth/auth.repository.js';
import prisma from '../lib/prisma.js';
import { createNextMock, createRequestMock, createResponseMock } from './lib/mockExpress.js';
describe('Auth test', () => {
  let service: AuthService;
  let controller: AuthController;
  let repository: AuthRepository;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    repository = new AuthRepository(prisma);
    service = new AuthService(repository);
    controller = new AuthController(service, repository);
  });

  it('if user email exist, throw 200 status with success message', async () => {
    const dummyUser = { id: 'cuid_123', email: 'example@hotmail.com', password: '12345678' };
    const res = await request(app).get('/auth');
    expect(res.status).toBe(200);
    //expect(res.json).toHaveBeenCalledWith({ message: '로그인에 성공했습니다.' });
  });

  it('if user email dosesnt exist, throw error 404', async () => {
    //const dummyUser = { email: 'example@hotmail.com', password: '12345678' };
    const req = createRequestMock({
      body: {
        email: 'example@hotmail.com',
        password: '12345678',
      },
    });
    const res = createResponseMock();
    const next = createNextMock();
    mockRepository.findByEmail.mockResolvedValue(null);
    await expect(controller.login(req, res, next)).rejects.toThrow();
    //expect(res.status).toHaveBeenCalledWith(404);
    //expect(res.json).toHaveBeenCalledWith({ messgae: '해당 유저를 찾을 수 없습니다.' });
  });

  it('유저의 비밀번호가 올바른 경우 ', async () => {
    const hashedPassword = await bcrypt.hash('12345678', 10);
    const dummyUser = { email: 'example@hotmail.com', password: hashedPassword };
    mockRepository.findByEmail.mockResolvedValue(dummyUser); // 유저 db 조회
    const req = createRequestMock({
      body: {
        email: 'example@hotmail.com',
        password: '12345678',
      },
    });
    const res = createResponseMock();
    const next = createNextMock();

    await controller.login(req, res, next);
  });

  it('유저의 비밀번호가 올바르지 않는 경우', async () => {
    const hashedPassword = await bcrypt.hash('12345678', 10);
    const dummyUser = { email: 'exmaple@hotmail.com', password: 'wrongpass' };
    //mockRepository.findUnique.mockResolvedValue(dummyUser); // 유저 db 값
    const req = createRequestMock({
      body: {
        email: 'example@hotmail.com',
        password: hashedPassword,
      },
    });
    const res = createResponseMock();
    const next = createNextMock();
    await expect(controller.login(req, res, next)).rejects.toThrow(
      '유효하지 않는 비밀번호 입니다.',
    );
  });

  it('유저 정보 존재시 토큰 생성', async () => {
    // 모의 유저 데이터 작성
    const dummyUser = { id: 'abc1', email: 'exmple@hotmail.com' };
    //mockRepository.user.findUnique.mockResolvedValue(dummyUser);
    // 서비스 로직에서 로그인 함수 호출
    const result = await service.login('abc1');
    // 서비스 모델에서의 리턴값에 토큰이 일치 하는지 확인
    ///expect(mockRepository.user.findUnique).toHaveBeenCalledWith('abc1');
    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
  });

  it('유저 정보 없는 경우', async () => {
    // 모의 유저 데이터 작성
    //mockRepository.user.findUnique.mockResolvedValue('0');
    // 서비스 로직에 로그인 함수 호출후 결과값 가져온후 비교후 던지기
    await expect(service.login('abc123')).rejects.toThrow('해당 유저를 찾지 못했습니다.');
  });

  it('로그아웃 성공', async () => {});
  it('로그아웃 실패', async () => {});

  it('리프레쉬 토큰 재생성 성공', async () => {});
  it('리프레쉬 토큰 재생성 실패', async () => {});
});
