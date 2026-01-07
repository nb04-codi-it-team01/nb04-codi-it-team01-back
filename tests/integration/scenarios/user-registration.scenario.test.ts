import request from 'supertest';
import { app } from '../../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../../helpers/test-db';
import { testUsers } from '../../helpers/test-fixtures';

/**
 * 시나리오: 사용자 회원가입
 *
 * 1. 구매자 회원가입
 *    POST /api/users
 *
 * 2. 판매자 회원가입
 *    POST /api/users
 *
 * 3. 중복 이메일로 회원가입 시도 (실패)
 *    POST /api/users
 */
describe('사용자 회원가입 시나리오', () => {
  beforeAll(async () => {
    await clearDatabase();
    await ensureGradeExists();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('구매자 회원가입 → 로그인 → 내 정보 조회', async () => {
    // 1. 구매자 회원가입
    const signupRes = await request(app).post('/api/users').send(testUsers.buyer);

    expect(signupRes.status).toBe(201);
    expect(signupRes.body).toHaveProperty('id');
    expect(signupRes.body.email).toBe(testUsers.buyer.email);
    expect(signupRes.body.name).toBe(testUsers.buyer.name);
    expect(signupRes.body.type).toBe(testUsers.buyer.type);
    expect(signupRes.body).not.toHaveProperty('password'); // 비밀번호는 응답에 포함되지 않음

    const userId = signupRes.body.id;

    // 2. 로그인
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body.user.email).toBe(testUsers.buyer.email);

    const accessToken = loginRes.body.accessToken;

    // 3. 내 정보 조회
    const myInfoRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(myInfoRes.status).toBe(200);
    expect(myInfoRes.body.id).toBe(userId);
    expect(myInfoRes.body.email).toBe(testUsers.buyer.email);
    expect(myInfoRes.body.name).toBe(testUsers.buyer.name);
    expect(myInfoRes.body).toHaveProperty('grade');
    expect(myInfoRes.body.grade.name).toBe('BRONZE');
  });

  it('판매자 회원가입 → 로그인 성공', async () => {
    // 1. 판매자 회원가입
    const signupRes = await request(app).post('/api/users').send(testUsers.seller);

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.type).toBe('SELLER');

    // 2. 로그인
    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.user.type).toBe('SELLER');
  });

  it('중복 이메일로 회원가입 시도 시 409 에러', async () => {
    // 이미 등록된 이메일로 재가입 시도
    const duplicateRes = await request(app).post('/api/users').send(testUsers.buyer);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.message).toContain('이미 존재하는');
  });

  it('validation 실패 - 이메일 형식 오류', async () => {
    const invalidEmailRes = await request(app)
      .post('/api/users')
      .send({
        ...testUsers.anotherBuyer,
        email: 'invalid-email', // 잘못된 이메일 형식
      });

    expect(invalidEmailRes.status).toBe(400);
  });

  it('validation 실패 - 필수 필드 누락', async () => {
    const missingFieldRes = await request(app).post('/api/users').send({
      email: 'test@test.com',
      // name, password, type 누락
    });

    expect(missingFieldRes.status).toBe(400);
  });
});
