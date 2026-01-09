import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';

/**
 * 시나리오: 인증(Authentication) 및 권한 제어(RBAC)
 * * [등장인물]
 * - 구매자 (일반 유저)
 * - 판매자 (비즈니스 유저)
 * * [진행 순서]
 * 1. [가입] 구매자와 판매자가 각각 회원가입을 한다.
 * 2. [로그인] 구매자가 로그인을 시도하여 액세스 토큰을 발급받는다. (성공)
 * 3. [보안] 비밀번호가 틀리면 로그인이 차단된다. (400 Bad Request)
 * 4. [보안] 존재하지 않는 이메일로 접근 시 차단된다. (404 Not Found)
 * 5. [권한] 구매자(BUYER) 토큰으로 판매자 전용 API(스토어 생성)를 호출하면 차단된다. (403 Forbidden)
 */
describe('인증 및 RBAC 통합 시나리오', () => {
  let buyerToken: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  // =================================================================
  // SCENARIO START
  // =================================================================

  it('1. [가입] 구매자와 판매자가 각각 회원가입을 한다.', async () => {
    // 구매자 가입
    const buyerRes = await request(app).post('/api/users').send(testUsers.buyer);
    expect(buyerRes.status).toBe(201);
    expect(buyerRes.body.type).toBe('BUYER');

    // 판매자 가입
    const sellerRes = await request(app).post('/api/users').send(testUsers.seller);
    expect(sellerRes.status).toBe(201);
    expect(sellerRes.body.type).toBe('SELLER');
  });

  it('2. [로그인] 구매자가 로그인을 시도하여 토큰을 발급받는다.', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();

    // 발급받은 토큰을 다음 시나리오(RBAC)를 위해 변수에 저장
    buyerToken = res.body.accessToken;
  });

  it('3. [보안] 비밀번호가 일치하지 않으면 로그인이 실패한다.', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(400);
  });

  it('4. [보안] 존재하지 않는 이메일은 로그인이 실패한다.', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(404);
  });

  it('5. [권한] 구매자가 판매자 전용 기능(스토어 생성)에 접근하면 403 에러가 발생한다.', async () => {
    // 2번 단계에서 저장해둔 buyerToken을 재사용
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: '권한 탈취 시도 스토어',
        address: '서울',
        phoneNumber: '010-0000-0000',
        content: '나는 구매자지만 스토어를 만들고 싶다',
      });

    // 403 Forbidden: 인증은 되었으나(토큰 유효), 권한이 없음
    expect(res.status).toBe(403);
  });
});
