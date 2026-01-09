import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../helpers/test-db';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 오더
 *
 * 1. 판매자 회원가입 & 로그인
 *    POST /api/users
 *    POST /api/auth/login
 *
 * 2. 판매자가 스토어 & 상품 생성 (DB 직접)
 *
 * 3. 구매자 회원가입 & 로그인
 *    POST /api/users
 *    POST /api/auth/login
 *
 * 4. 주문 생성
 *    POST /api/orders
 *
 * 5. 주문 목록 조회
 *    GET /api/orders
 *
 * 6. 주문 상세 조회
 *    GET /api/orders/:orderId
 *
 * 7. 주문 정보 수정
 *    PATCH /api/orders/:orderId
 *
 * 8. 주문 삭제
 *    DELETE /api/orders/:orderId
 */
describe('주문 생명주기 시나리오', () => {
  let buyerToken: string;
  let sellerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;
  let orderId: string;

  beforeAll(async () => {
    await clearDatabase();
    await ensureGradeExists();

    // 1. 판매자 회원가입 & 로그인
    const sellerSignupRes = await request(app).post('/api/users').send({
      email: 'seller@test.com',
      password: 'TestPassword123!',
      name: '판매자',
      type: 'SELLER',
    });
    sellerId = sellerSignupRes.body.id;

    // 2. 판매자가 스토어 & 상품 생성 (DB 직접)
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
      where: { en: 'M' },
    });
    if (!size) {
      size = await prisma.size.create({
        data: { en: 'M', ko: 'M' },
      });
    }
    sizeId = size.id;

    const product = await prisma.product.create({
      data: {
        name: '테스트 상품',
        content: '주문 테스트용 상품입니다',
        price: 50000,
        categoryName: 'TOP',
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
        quantity: 100,
      },
    });

    // 3. 구매자 회원가입 & 로그인
    await request(app).post('/api/users').send({
      email: 'buyer@test.com',
      password: 'TestPassword123!',
      name: '구매자',
      type: 'BUYER',
    });

    const buyerLoginRes = await request(app).post('/api/auth/login').send({
      email: 'buyer@test.com',
      password: 'TestPassword123!',
    });
    buyerToken = buyerLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('주문 생성 → 목록 조회 → 상세 조회', async () => {
    // 4. 주문 생성
    const createOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: '구매자',
        phone: '0101234-5678',
        address: '서울시 강남구 테헤란로 123',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 2,
          },
        ],
        usePoint: 0,
      });

    expect(createOrderRes.status).toBe(201);
    expect(createOrderRes.body).toHaveProperty('id');
    expect(createOrderRes.body.name).toBe('구매자');
    orderId = createOrderRes.body.id;

    // 5. 주문 목록 조회
    const getOrdersRes = await request(app)
      .get('/api/orders?page=1&limit=10')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(getOrdersRes.status).toBe(200);
    expect(getOrdersRes.body).toHaveProperty('data');
    expect(Array.isArray(getOrdersRes.body.data)).toBe(true);
    expect(getOrdersRes.body.data.length).toBeGreaterThan(0);

    // 6. 주문 상세 조회
    const getOrderDetailRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(getOrderDetailRes.status).toBe(200);
    expect(getOrderDetailRes.body.id).toBe(orderId);
    expect(getOrderDetailRes.body).toHaveProperty('orderItems');
    expect(Array.isArray(getOrderDetailRes.body.orderItems)).toBe(true);
  });

  it('결제 완료된 주문 수정/삭제 시도 시 400 에러', async () => {
    // 주문 생성 (자동으로 CompletedPayment 상태가 됨)
    const createOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: '구매자',
        phone: '0101234-5678',
        address: '서울시 강남구',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 1,
          },
        ],
        usePoint: 0,
      });

    const orderId = createOrderRes.body.id;

    // 결제 완료된 주문 수정 시도
    const updateOrderRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: '구매자수정',
        phone: '0119876-5432',
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

    expect(updateOrderRes.status).toBe(400);
    expect(updateOrderRes.body.message).toContain('결제 대기 상태');

    // 결제 완료된 주문 삭제 시도
    const deleteOrderRes = await request(app)
      .delete(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(deleteOrderRes.status).toBe(400);
    expect(deleteOrderRes.body.message).toContain('결제 대기 상태');
  });

  it('인증 없이 주문 생성 시도 시 401 에러', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        name: '구매자',
        phone: '0101234-5678',
        address: '서울시 강남구',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 1,
          },
        ],
        usePoint: 0,
      });

    expect(res.status).toBe(401);
  });

  it('잘못된 orderId로 조회 시 404 에러', async () => {
    const res = await request(app)
      .get('/api/orders/invalid-order-id')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(404);
  });

  it('주문 생성 시 유효하지 않은 전화번호 형식으로 400 에러', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: '구매자',
        phone: '잘못된형식', // 잘못된 형식
        address: '서울시 강남구',
        orderItems: [
          {
            productId: productId,
            sizeId: sizeId,
            quantity: 1,
          },
        ],
        usePoint: 0,
      });

    expect(res.status).toBe(400);
  });
});
