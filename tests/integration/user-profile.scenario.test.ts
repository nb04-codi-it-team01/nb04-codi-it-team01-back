/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../helpers/test-db';
import { testUsers, updateUserData } from '../helpers/test-fixtures';

/**
 * 시나리오: 사용자 프로필 관리
 *
 * 1. 회원가입
 *    POST /api/users
 *
 * 2. 로그인
 *    POST /api/auth/login
 *
 * 3. 내 정보 조회
 *    GET /api/users/me
 *
 * 4. 내 정보 수정 (이름, 비밀번호)
 *    PATCH /api/users/me
 *
 * 5. 변경된 비밀번호로 재로그인
 *    POST /api/auth/login
 *
 * 6. 토큰 갱신
 *    POST /api/auth/refresh
 *
 * 7. 로그아웃
 *    POST /api/auth/logout
 */
describe('사용자 프로필 관리 시나리오', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await clearDatabase();
    await ensureGradeExists();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('회원가입 → 로그인 → 내 정보 조회 → 정보 수정 → 새 비밀번호로 로그인', async () => {
    // 1. 회원가입
    const signupRes = await request(app).post('/api/users').send(testUsers.buyer);

    expect(signupRes.status).toBe(201);
    userId = signupRes.body.id;

    // 2. 로그인
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body).toHaveProperty('accessToken');
    // refreshToken은 쿠키로 전달되므로 body에는 없음

    accessToken = loginRes.body.accessToken;

    // 3. 내 정보 조회
    const myInfoRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(myInfoRes.status).toBe(200);
    expect(myInfoRes.body.id).toBe(userId);
    expect(myInfoRes.body.name).toBe(testUsers.buyer.name);
    expect(myInfoRes.body.email).toBe(testUsers.buyer.email);

    // 4. 내 정보 수정 (이름, 비밀번호 변경)
    const updateRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: updateUserData.name,
        password: updateUserData.password,
        currentPassword: updateUserData.currentPassword,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe(updateUserData.name);
    expect(updateRes.body).not.toHaveProperty('password');

    // 5. 변경된 비밀번호로 재로그인
    const reLoginRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: updateUserData.password,
    });

    expect(reLoginRes.status).toBe(201);
    expect(reLoginRes.body.user.name).toBe(updateUserData.name);

    // 6. 이전 비밀번호로 로그인 시도 (실패)
    const oldPasswordRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password, // 이전 비밀번호
    });

    // 잘못된 비밀번호는 400 또는 401 에러
    expect([400, 401]).toContain(oldPasswordRes.status);
  });

  it('잘못된 현재 비밀번호로 정보 수정 시도 시 401 에러', async () => {
    // 이전 테스트에서 비밀번호가 변경되었으므로 새로운 계정으로 테스트
    const newUser = {
      email: 'wrongpasstest@test.com',
      password: 'TestPassword123!',
      name: '비밀번호테스트',
      type: 'BUYER' as const,
    };

    // 회원가입
    await request(app).post('/api/users').send(newUser);

    // 로그인
    const loginRes = await request(app).post('/api/auth/login').send({
      email: newUser.email,
      password: newUser.password,
    });

    const token = loginRes.body.accessToken;

    // 잘못된 현재 비밀번호로 수정 시도
    const updateRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '또다른이름',
        currentPassword: 'WrongPassword123!', // 잘못된 현재 비밀번호
      });

    expect(updateRes.status).toBe(401);
    expect(updateRes.body.message).toContain('비밀번호가 일치하지 않습니다');
  });

  it('인증 없이 내 정보 조회 시도 시 401 에러', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
  });

  it('만료된/잘못된 토큰으로 요청 시 401 에러', async () => {
    const invalidToken = 'invalid.token.here';

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.status).toBe(401);
  });
});
