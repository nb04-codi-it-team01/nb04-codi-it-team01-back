import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 문의 권한 검증
 *
 * 1. 구매자A, 구매자B, 판매자 회원가입 & 로그인
 * 2. 판매자가 스토어 & 상품 생성
 * 3. 구매자A가 문의 작성
 * 4. 구매자B가 구매자A의 문의 조회 시도 (실패)
 * 5. 구매자B가 구매자A의 문의 수정 시도 (실패)
 * 6. 구매자B가 구매자A의 문의 삭제 시도 (실패)
 * 7. 구매자A가 문의에 답변 작성 시도 (실패 - 판매자만 가능)
 * 8. 판매자가 답변 작성 (성공)
 * 9. 구매자A가 판매자의 답변 수정 시도 (실패)
 */
describe('문의 권한 검증 시나리오', () => {
  let buyerAToken: string;
  let buyerBToken: string;
  let sellerToken: string;
  let sellerId: string;
  let productId: string;
  let inquiryId: string;
  let replyId: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('구매자A, 구매자B, 판매자 회원가입 & 로그인', async () => {
    // 구매자A
    const buyerASignup = await request(app).post('/api/users').send(testUsers.buyer);
    expect(buyerASignup.status).toBe(201);

    const buyerALogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerAToken = buyerALogin.body.accessToken;

    // 구매자B
    const buyerBData = {
      ...testUsers.anotherBuyer,
      email: 'buyerB@test.com',
    };
    const buyerBSignup = await request(app).post('/api/users').send(buyerBData);
    expect(buyerBSignup.status).toBe(201);

    const buyerBLogin = await request(app).post('/api/auth/login').send({
      email: buyerBData.email,
      password: buyerBData.password,
    });
    buyerBToken = buyerBLogin.body.accessToken;

    // 판매자
    const sellerSignup = await request(app).post('/api/users').send(testUsers.seller);
    expect(sellerSignup.status).toBe(201);
    sellerId = sellerSignup.body.id;

    const sellerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = sellerLogin.body.accessToken;
  });

  it('판매자가 스토어 & 상품 생성', async () => {
    const store = await prisma.store.create({
      data: {
        name: '권한 테스트 스토어',
        address: '서울시 강남구',
        phoneNumber: '02-1234-5678',
        content: '권한 테스트용',
        userId: sellerId,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: '권한 테스트 상품',
        content: '권한 테스트용 상품',
        price: 20000,
        categoryName: 'TOP',
        storeId: store.id,
        image: 'https://fake-s3-url.com/product.jpg',
      },
    });
    productId = product.id;
  });

  it('구매자A가 문의 작성', async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/inquiries`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        title: '권한 테스트 문의',
        content: '이것은 구매자A의 문의입니다',
        isSecret: true, // 비밀 문의로 설정
      });

    expect(res.status).toBe(201);
    inquiryId = res.body.id;
  });

  it('구매자B가 구매자A의 비밀 문의 조회 시도 → 403 에러', async () => {
    const res = await request(app)
      .get(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(res.status).toBe(403);
  });

  it('구매자B가 구매자A의 문의 수정 시도 → 403 에러', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({
        title: '수정 시도',
        content: '다른 사람의 문의 수정',
        isSecret: true,
      });

    expect(res.status).toBe(403);
  });

  it('구매자B가 구매자A의 문의 삭제 시도 → 403 에러', async () => {
    const res = await request(app)
      .delete(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(res.status).toBe(403);
  });

  it('구매자A가 자신의 문의에 답변 작성 시도 → 403 에러 (판매자만 가능)', async () => {
    const res = await request(app)
      .post(`/api/inquiries/${inquiryId}/replies`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        content: '구매자가 답변 작성 시도',
      });

    expect(res.status).toBe(403);
  });

  it('판매자가 답변 작성 → 성공', async () => {
    const res = await request(app)
      .post(`/api/inquiries/${inquiryId}/replies`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        content: '판매자 답변입니다',
      });

    expect(res.status).toBe(201);
    replyId = res.body.id;
  });

  it('구매자A가 판매자의 답변 수정 시도 → 403 에러', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${replyId}/replies`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        content: '구매자가 답변 수정 시도',
      });

    expect(res.status).toBe(403);
  });

  it('인증 없이 문의 조회 시도 → 401 에러', async () => {
    const res = await request(app).get(`/api/inquiries/${inquiryId}`);

    expect(res.status).toBe(401);
  });
});
