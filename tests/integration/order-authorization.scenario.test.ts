import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../helpers/test-db';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 주문 권한 테스트
 *
 * 1. 두 명의 구매자 회원가입 & 로그인
 * 2. 구매자 A가 주문 생성
 * 3. 구매자 B가 A의 주문 조회 시도 (403)
 * 4. 구매자 B가 A의 주문 수정 시도 (403)
 * 5. 구매자 B가 A의 주문 삭제 시도 (403)
 */
describe('주문 권한 테스트 시나리오', () => {
  let buyerAToken: string;
  let buyerBToken: string;
  let sellerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;
  let orderIdA: string;

  beforeAll(async () => {
    await clearDatabase();
    await ensureGradeExists();

    // 판매자 생성
    const sellerSignupRes = await request(app).post('/api/users').send({
      email: 'seller@test.com',
      password: 'TestPassword123!',
      name: '판매자',
      type: 'SELLER',
    });
    sellerId = sellerSignupRes.body.id;

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

    // Size 생성 또는 가져오기
    let size = await prisma.size.findFirst({
      where: { en: 'L' },
    });
    if (!size) {
      size = await prisma.size.create({
        data: { en: 'L', ko: 'L' },
      });
    }
    sizeId = size.id;

    // 상품 생성
    const product = await prisma.product.create({
      data: {
        name: '테스트 상품',
        content: '주문 권한 테스트용 상품',
        price: 30000,
        categoryName: 'BOTTOM',
        storeId: storeId,
        image: 'https://fake-s3-url.com/product.jpg',
      },
    });
    productId = product.id;

    // 재고 생성
    await prisma.stock.create({
      data: {
        productId: productId,
        sizeId: sizeId,
        quantity: 50,
      },
    });

    // 1. 구매자 A 회원가입 & 로그인
    await request(app).post('/api/users').send({
      email: 'buyerA@test.com',
      password: 'TestPassword123!',
      name: '구매자A',
      type: 'BUYER',
    });

    const buyerALoginRes = await request(app).post('/api/auth/login').send({
      email: 'buyerA@test.com',
      password: 'TestPassword123!',
    });
    buyerAToken = buyerALoginRes.body.accessToken;

    // 구매자 B 회원가입 & 로그인
    await request(app).post('/api/users').send({
      email: 'buyerB@test.com',
      password: 'TestPassword123!',
      name: '구매자B',
      type: 'BUYER',
    });

    const buyerBLoginRes = await request(app).post('/api/auth/login').send({
      email: 'buyerB@test.com',
      password: 'TestPassword123!',
    });
    buyerBToken = buyerBLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('구매자 A가 주문 생성 → 구매자 B가 A의 주문 조회/수정/삭제 시도 시 403 에러', async () => {
    // 2. 구매자 A가 주문 생성
    const createOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        name: '구매자A',
        phone: '0101111-2222',
        address: '서울시 강남구 테헤란로 111',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 1,
          },
        ],
        usePoint: 0,
      });

    expect(createOrderRes.status).toBe(201);
    orderIdA = createOrderRes.body.id;

    // 3. 구매자 B가 A의 주문 조회 시도 (403)
    const getOrderRes = await request(app)
      .get(`/api/orders/${orderIdA}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(getOrderRes.status).toBe(403);

    // 4. 구매자 B가 A의 주문 수정 시도 (403)
    const updateOrderRes = await request(app)
      .patch(`/api/orders/${orderIdA}`)
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({
        name: '구매자B',
        phone: '0113333-4444',
        address: '서울시 서초구',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 2,
          },
        ],
        usePoint: 0,
      });

    expect(updateOrderRes.status).toBe(403);

    // 5. 구매자 B가 A의 주문 삭제 시도 (403)
    const deleteOrderRes = await request(app)
      .delete(`/api/orders/${orderIdA}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(deleteOrderRes.status).toBe(403);

    // 검증: 구매자 A는 여전히 자신의 주문을 조회할 수 있어야 함
    const verifyOrderRes = await request(app)
      .get(`/api/orders/${orderIdA}`)
      .set('Authorization', `Bearer ${buyerAToken}`);

    expect(verifyOrderRes.status).toBe(200);
    expect(verifyOrderRes.body.id).toBe(orderIdA);
  });

  it('인증 없이 주문 목록 조회 시도 시 401 에러', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(401);
  });

  it('인증 없이 주문 상세 조회 시도 시 401 에러', async () => {
    const res = await request(app).get(`/api/orders/${orderIdA}`);

    expect(res.status).toBe(401);
  });
});
