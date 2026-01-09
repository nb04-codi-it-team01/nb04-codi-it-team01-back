import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 문의
 *
 * 1. 구매자 회원가입 & 로그인
 *    POST /api/users
 *    POST /api/auth/login
 *
 * 2. 판매자 회원가입 & 로그인 & 스토어/상품 생성
 *    POST /api/users
 *    POST /api/auth/login
 *    (DB에서 직접 스토어와 상품 생성)
 *
 * 3. 구매자가 상품에 문의 작성
 *    POST /api/products/:productId/inquiries
 *
 * 4. 구매자가 자신의 문의 목록 조회
 *    GET /api/inquiries
 *
 * 5. 구매자가 문의 상세 조회
 *    GET /api/inquiries/:inquiryId
 *
 * 6. 구매자가 문의 수정
 *    PATCH /api/inquiries/:inquiryId
 *
 * 7. 판매자가 문의에 답변 작성
 *    POST /api/inquiries/:inquiryId/replies
 *
 * 8. 판매자가 답변 수정
 *    PATCH /api/inquiries/:replyId/replies
 *
 * 9. 구매자가 답변된 문의 확인
 *    GET /api/inquiries/:inquiryId
 *
 * 10. 구매자가 문의 삭제
 *     DELETE /api/inquiries/:inquiryId
 */
describe('문의 시나리오', () => {
  let buyerToken: string;
  let sellerToken: string;
  let sellerId: string;
  let storeId: string;
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

  it('구매자 & 판매자 회원가입 → 로그인', async () => {
    // 1. 구매자 회원가입
    const buyerSignup = await request(app).post('/api/users').send(testUsers.buyer);
    expect(buyerSignup.status).toBe(201);

    // 2. 구매자 로그인
    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    expect(buyerLogin.status).toBe(201);
    buyerToken = buyerLogin.body.accessToken;

    // 3. 판매자 회원가입
    const sellerSignup = await request(app).post('/api/users').send(testUsers.seller);
    expect(sellerSignup.status).toBe(201);
    sellerId = sellerSignup.body.id;

    // 4. 판매자 로그인
    const sellerLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    expect(sellerLogin.status).toBe(201);
    sellerToken = sellerLogin.body.accessToken;
  });

  it('판매자가 스토어 & 상품 생성 (DB 직접)', async () => {
    // 스토어 생성
    const store = await prisma.store.create({
      data: {
        name: '테스트 스토어',
        address: '서울시 강남구',
        phoneNumber: '02-1234-5678',
        content: '테스트용 스토어입니다',
        userId: sellerId,
      },
    });
    storeId = store.id;

    // 상품 생성
    const product = await prisma.product.create({
      data: {
        name: '테스트 상품',
        content: '문의 테스트용 상품입니다',
        price: 10000,
        categoryName: 'TOP',
        storeId: storeId,
        image: 'https://fake-s3-url.com/product.jpg',
      },
    });
    productId = product.id;
  });

  it('구매자가 상품에 문의 작성 → 문의 목록 조회', async () => {
    // 5. 문의 작성
    const createRes = await request(app)
      .post(`/api/products/${productId}/inquiries`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: '상품 문의 드립니다',
        content: '이 상품 재고가 있나요?',
        isSecret: false,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.title).toBe('상품 문의 드립니다');
    expect(createRes.body.status).toBe('WaitingAnswer');
    inquiryId = createRes.body.id;

    // 6. 구매자의 문의 목록 조회
    const listRes = await request(app)
      .get('/api/inquiries?page=1&pageSize=10')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.list).toHaveLength(1);
    expect(listRes.body.list[0].id).toBe(inquiryId);
  });

  it('구매자가 문의 상세 조회 → 수정', async () => {
    // 7. 문의 상세 조회
    const detailRes = await request(app)
      .get(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(inquiryId);
    expect(detailRes.body.title).toBe('상품 문의 드립니다');

    // 8. 문의 수정
    const updateRes = await request(app)
      .patch(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: '상품 문의 수정합니다',
        content: '재고와 배송비도 알려주세요',
        isSecret: false,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('상품 문의 수정합니다');
    expect(updateRes.body.content).toBe('재고와 배송비도 알려주세요');
  });

  it('판매자가 문의 답변 작성 → 수정', async () => {
    // 9. 답변 작성
    const replyRes = await request(app)
      .post(`/api/inquiries/${inquiryId}/replies`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        content: '재고 충분합니다. 배송비는 3,000원입니다.',
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body).toHaveProperty('id');
    expect(replyRes.body.content).toBe('재고 충분합니다. 배송비는 3,000원입니다.');
    replyId = replyRes.body.id;

    // 10. 답변 수정
    const updateReplyRes = await request(app)
      .patch(`/api/inquiries/${replyId}/replies`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        content: '재고 충분합니다. 배송비는 무료입니다!',
      });

    expect(updateReplyRes.status).toBe(200);
    expect(updateReplyRes.body.content).toBe('재고 충분합니다. 배송비는 무료입니다!');
  });

  it('구매자가 답변된 문의 확인', async () => {
    // 11. 답변된 문의 상세 조회
    const detailRes = await request(app)
      .get(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.status).toBe('CompletedAnswer');
    expect(detailRes.body.reply).toBeDefined();
    expect(detailRes.body.reply.content).toBe('재고 충분합니다. 배송비는 무료입니다!');
  });

  it('구매자가 문의 삭제', async () => {
    // 12. 문의 삭제
    const deleteRes = await request(app)
      .delete(`/api/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(deleteRes.status).toBe(200);

    // 13. 삭제 확인
    const listRes = await request(app)
      .get('/api/inquiries?page=1&pageSize=10')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.list).toHaveLength(0);
  });
});
