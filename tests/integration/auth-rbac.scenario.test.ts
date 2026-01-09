import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import { JWT_REFRESH_TOKEN_COOKIE_NAME } from '../../src/lib/constants';

/**
 * 시나리오: 인증(Authentication), 권한 제어(RBAC), 토큰 관리(Refresh/Logout)
 * * [등장인물]
 * - 구매자 (일반 유저)
 * - 판매자 (비즈니스 유저)
 * * [진행 순서]
 * 1. [가입] 구매자와 판매자가 각각 회원가입을 한다.
 * 2. [로그인] 구매자가 로그인을 시도하여 액세스 토큰을 발급받는다. (성공)
 * 3. [보안] 비밀번호가 틀리면 로그인이 차단된다. (400 Bad Request)
 * 4. [보안] 존재하지 않는 이메일로 접근 시 차단된다. (404 Not Found)
 * 5. [권한] 구매자(BUYER) 토큰으로 판매자 전용 API(스토어 생성)를 호출하면 차단된다. (403 Forbidden)
 * 6. [갱신] 리프레시 토큰으로 새로운 액세스 토큰을 발급받는다.
 * 7. [로그아웃] 구매자가 로그아웃을 한다. (DB에서 리프레시 토큰 삭제)
 * 8. [보안] 로그아웃 후(또는 탈취된) 리프레시 토큰으로 갱신을 시도하면 차단된다. (401)
 */
describe('인증 및 RBAC 통합 시나리오', () => {
  let buyerAccessToken: string;
  let buyerRefreshToken: string;

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

    // 1. Access Token 저장
    buyerAccessToken = res.body.accessToken;

    // 2. Refresh Token 추출 (Body 또는 Cookie)
    if (res.body.refreshToken) {
      buyerRefreshToken = res.body.refreshToken;
    } else {
      const cookies = res.headers['set-cookie'] as unknown as string[];

      if (cookies) {
        const refreshCookie = cookies.find((c) => c.startsWith(JWT_REFRESH_TOKEN_COOKIE_NAME));

        if (refreshCookie) {
          buyerRefreshToken = refreshCookie.split(';')[0].split('=')[1];
        }
      }
    }
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
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${buyerAccessToken}`)
      .send({
        name: '권한 탈취 시도 스토어',
        address: '서울',
        phoneNumber: '010-0000-0000',
        content: '나는 구매자지만 스토어를 만들고 싶다',
      });

    // 403 Forbidden: 인증은 되었으나(토큰 유효), 권한이 없음
    expect(res.status).toBe(403);
  });

  it('6. [갱신] 리프레시 토큰으로 새로운 액세스 토큰을 발급받는다.', async () => {
    const cookieString = `${JWT_REFRESH_TOKEN_COOKIE_NAME}=${buyerRefreshToken}`;
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookieString);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    buyerAccessToken = res.body.accessToken;
    buyerRefreshToken = res.body.refreshToken;
  });

  it('7. [로그아웃] 로그아웃을 요청하면 성공적으로 처리된다.', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${buyerAccessToken}`);

    expect([200, 204]).toContain(res.status);
  });

  it('8. [보안] 로그아웃 후 기존 리프레시 토큰으로 갱신을 시도하면 401 에러가 발생한다.', async () => {
    const cookieString = `${JWT_REFRESH_TOKEN_COOKIE_NAME}=${buyerRefreshToken}`;
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookieString);

    expect(res.status).toBe(401);
  });
});
