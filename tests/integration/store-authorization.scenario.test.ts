import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';

/**
 * 시나리오: 스토어 권한 검증 (보안 및 RBAC)
 *
 * 1. 판매자A, 판매자B, 구매자 회원가입 및 로그인
 * 2. 구매자가 스토어 생성을 시도 (실패 - 403 Forbidden)
 * 3. 판매자A가 스토어를 생성한 뒤, 추가 생성을 시도 (실패 - 409 Conflict)
 * 4. 판매자B가 판매자A의 스토어 정보를 수정을 시도 (실패 - 403 Forbidden)
 * 5. 로그인하지 않은 상태로 보호된 스토어 API에 접근 (실패 - 401 Unauthorized)
 */

describe('스토어 권한 검증 시나리오', () => {
  let sellerToken: string;
  let otherSellerToken: string;
  let buyerToken: string;
  let sellerStoreId: string;

  // 모든 테스트에서 공통으로 사용할 유효한 스토어 데이터
  const validStoreData = {
    name: '유효한 스토어',
    address: '서울시 강남구',
    phoneNumber: '010-1234-5678', // 최소 10자 이상 (로그의 too_small 에러 방지)
    content: '테스트용 스토어 설명입니다.',
  };

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('1. 판매자A, 판매자B, 구매자 회원가입 & 로그인', async () => {
    await request(app).post('/api/users').send(testUsers.seller);
    const sellerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = sellerLogin.body.accessToken;

    const otherSellerData = { ...testUsers.seller, email: 'sellerB@test.com' };
    await request(app).post('/api/users').send(otherSellerData);
    const otherLogin = await request(app).post('/api/auth/login').send({
      email: otherSellerData.email,
      password: otherSellerData.password,
    });
    otherSellerToken = otherLogin.body.accessToken;

    await request(app).post('/api/users').send(testUsers.buyer);
    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerToken = buyerLogin.body.accessToken;

    expect(sellerToken).toBeDefined();
  });

  it('2. 구매자가 스토어 생성을 시도 (실패 - 403)', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(validStoreData); // 필수 데이터 포함

    expect(res.status).toBe(403);
  });

  it('3. 판매자A가 스토어 생성 및 중복 생성 시도 (실패 - 409)', async () => {
    // 첫 번째 스토어 생성 (성공해야 함)
    const createRes = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ ...validStoreData, name: '판매자A의 스토어' });

    sellerStoreId = createRes.body.id;
    expect(createRes.status).toBe(201);

    // 같은 계정으로 두 번째 스토어 생성 시도 (실패해야 함)
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ ...validStoreData, name: '중복 스토어' });

    expect(res.status).toBe(409);
  });

  it('4. 판매자B가 판매자A의 스토어 수정을 시도 (실패 - 403)', async () => {
    // sellerStoreId가 제대로 정의되었는지 확인
    expect(sellerStoreId).toBeDefined();

    const res = await request(app)
      .patch(`/api/stores/${sellerStoreId}`)
      .set('Authorization', `Bearer ${otherSellerToken}`)
      .send({ name: '해킹 시도' });

    expect(res.status).toBe(403);
  });

  it('5. 로그인하지 않은 상태로 API 접근 시도 (실패 - 401)', async () => {
    const res = await request(app).get('/api/stores/detail/my');
    expect(res.status).toBe(401);
  });
});
