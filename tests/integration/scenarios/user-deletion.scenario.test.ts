/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../../helpers/test-db';
import { testUsers } from '../../helpers/test-fixtures';
import prisma from '../../../src/lib/prisma';

/**
 * 시나리오: 사용자 계정 삭제
 *
 * 1. 회원가입
 *    POST /api/users
 *
 * 2. 로그인
 *    POST /api/auth/login
 *
 * 3. 내 정보 조회 (삭제 전 확인)
 *    GET /api/users/me
 *
 * 4. 회원 탈퇴
 *    DELETE /api/users/delete
 *
 * 5. 삭제된 계정으로 로그인 시도 (실패)
 *    POST /api/auth/login
 *
 * 6. 삭제된 계정으로 내 정보 조회 시도 (실패)
 *    GET /api/users/me
 */
describe('사용자 계정 삭제 시나리오', () => {
  beforeAll(async () => {
    await clearDatabase();
    await ensureGradeExists();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('회원가입 → 로그인 → 회원 탈퇴 → 로그인 실패', async () => {
    // 1. 회원가입
    const signupRes = await request(app).post('/api/users').send(testUsers.buyer);

    expect(signupRes.status).toBe(201);
    const userId = signupRes.body.id;

    // 2. 로그인
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    expect(loginRes.status).toBe(201);
    const accessToken = loginRes.body.accessToken;

    // 3. 내 정보 조회 (삭제 전)
    const beforeDeleteRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(beforeDeleteRes.status).toBe(200);
    expect(beforeDeleteRes.body.id).toBe(userId);

    // 4. 회원 탈퇴
    const deleteRes = await request(app)
      .delete('/api/users/delete')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(200);

    // 5. DB에서 사용자가 삭제되었는지 확인
    const deletedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    expect(deletedUser).toBeNull();

    // 6. 삭제된 계정으로 로그인 시도 (실패)
    const loginAfterDeleteRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    // 삭제된 사용자는 404 또는 401 에러
    expect([401, 404]).toContain(loginAfterDeleteRes.status);
    expect(loginAfterDeleteRes.body.message).toContain('이메일 또는 비밀번호');

    // 7. 삭제된 토큰으로 내 정보 조회 시도 (실패)
    const afterDeleteRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // 토큰은 유효하지만 사용자가 삭제되어 404 또는 401 에러
    expect([401, 404]).toContain(afterDeleteRes.status);
  });

  it('인증 없이 회원 탈퇴 시도 시 401 에러', async () => {
    const res = await request(app).delete('/api/users/delete');

    expect(res.status).toBe(401);
  });
});
