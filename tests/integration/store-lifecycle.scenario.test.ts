import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';

/**
 * 시나리오: 스토어
 *
 * 1. 판매자와 구매자가 각각 회원가입 후 로그인하여 토큰을 발급받는다.
 * 2. 판매자가 본인의 스토어를 성공적으로 생성한다.
 * 3. 비로그인 유저를 포함한 누구나 스토어 상세 정보를 조회한다.
 * 4. 판매자가 본인 스토어의 관리용 상세 정보(통계 등)를 확인한다.
 * 5. 판매자가 스토어의 정보를 수정한다.
 * 6. 구매자가 스토어를 찜(Favorite) 등록하고 다시 해제한다.
 */

describe('스토어 시나리오', () => {
  let sellerToken: string;
  let buyerToken: string;
  let storeId: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('1. 판매자와 구매자가 각각 가입 후 토큰을 발급받는다.', async () => {
    await request(app).post('/api/users').send(testUsers.seller);
    const sellerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = sellerLogin.body.accessToken;

    await request(app).post('/api/users').send(testUsers.buyer);
    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerToken = buyerLogin.body.accessToken;

    expect(sellerToken).toBeDefined();
    expect(buyerToken).toBeDefined();
  });

  it('2. 판매자가 스토어를 성공적으로 생성한다.', async () => {
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: '정석 판매점',
        address: '서울시 강남구',
        phoneNumber: '02-123-4567',
        content: '최고의 상품만 취급합니다.',
      });

    expect(res.status).toBe(201);
    storeId = res.body.id;
  });

  it('3. 누구나 스토어 상세 정보를 조회할 수 있다.', async () => {
    const res = await request(app).get(`/api/stores/${storeId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('정석 판매점');
  });

  it('4. 판매자가 자신의 관리용 스토어 정보를 조회한다.', async () => {
    const res = await request(app)
      .get('/api/stores/detail/my')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('productCount');
    expect(res.body).toHaveProperty('favoriteCount');
    expect(res.body).toHaveProperty('monthFavoriteCount');
    expect(res.body).toHaveProperty('totalSoldCount');
  });

  it('5. 판매자가 스토어의 정보를 수정한다.', async () => {
    const res = await request(app)
      .patch(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: '이름 변경된 스토어' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('이름 변경된 스토어');
  });

  it('6. 구매자가 스토어를 찜하고, 숫자가 정상적으로 증가/감소하는지 확인한다.', async () => {
    // 1. 찜 등록 전: 현재 찜 수 확인
    const beforeRes = await request(app).get(`/api/stores/${storeId}`);
    const beforeCount = beforeRes.body.favoriteCount || 0;

    // 2. 찜 등록 API 호출
    const regRes = await request(app)
      .post(`/api/stores/${storeId}/favorite`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(regRes.status).toBe(201);

    // 3. 찜 등록 후: 찜 수가 1 증가했는지 확인
    const afterRegRes = await request(app).get(`/api/stores/${storeId}`);
    expect(afterRegRes.body.favoriteCount).toBe(beforeCount + 1);

    // 4. 찜 해제 API 호출
    const unregRes = await request(app)
      .delete(`/api/stores/${storeId}/favorite`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(unregRes.status).toBe(204);

    // 5. 찜 해제 후: 찜 수가 다시 원래대로 돌아왔는지 확인
    const afterUnregRes = await request(app).get(`/api/stores/${storeId}`);
    expect(afterUnregRes.body.favoriteCount).toBe(beforeCount);
  });
});
