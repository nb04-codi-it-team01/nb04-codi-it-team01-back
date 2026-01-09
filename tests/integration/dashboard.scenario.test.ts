/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, ensureGradeExists } from '../helpers/test-db';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 대시보드 조회 테스트
 *
 * 1. 판매자 회원가입 & 로그인
 *    POST /api/users
 *    POST /api/auth/login
 *
 * 2. 판매자가 스토어 & 상품 생성 (DB 직접)
 *
 * 3. 구매자 회원가입 & 주문 생성 (DB 직접)
 *
 * 4. 판매자가 대시보드 조회
 *    GET /api/dashboard
 *
 * 5. 구매자가 대시보드 조회 시도 (403 에러)
 */
describe('대시보드 조회 시나리오', () => {
  let sellerToken: string;
  let buyerToken: string;
  let sellerId: string;
  let buyerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;

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

    const sellerLoginRes = await request(app).post('/api/auth/login').send({
      email: 'seller@test.com',
      password: 'TestPassword123!',
    });
    sellerToken = sellerLoginRes.body.accessToken;

    // 2. 판매자가 스토어 & 상품 생성 (DB 직접)
    const store = await prisma.store.create({
      data: {
        name: '대시보드 테스트 스토어',
        address: '서울시 강남구',
        phoneNumber: '02-1234-5678',
        content: '대시보드 테스트용 스토어입니다',
        userId: sellerId,
      },
    });
    storeId = store.id;

    // Size 생성 또는 가져오기
    let size = await prisma.size.findFirst({
      where: { en: 'XL' },
    });
    if (!size) {
      size = await prisma.size.create({
        data: { en: 'XL', ko: 'XL' },
      });
    }
    sizeId = size.id;

    const product = await prisma.product.create({
      data: {
        name: '대시보드 테스트 상품',
        content: '대시보드 테스트용 상품입니다',
        price: 100000,
        categoryName: 'OUTER',
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
        quantity: 200,
      },
    });

    // 3. 구매자 회원가입
    const buyerSignupRes = await request(app).post('/api/users').send({
      email: 'buyer@test.com',
      password: 'TestPassword123!',
      name: '구매자',
      type: 'BUYER',
    });
    buyerId = buyerSignupRes.body.id;

    const buyerLoginRes = await request(app).post('/api/auth/login').send({
      email: 'buyer@test.com',
      password: 'TestPassword123!',
    });
    buyerToken = buyerLoginRes.body.accessToken;

    // 주문 생성 (DB 직접)
    const order = await prisma.order.create({
      data: {
        name: '구매자',
        phoneNumber: '0101234-5678',
        address: '서울시 강남구',
        subtotal: 200000,
        totalQuantity: 2,
        usePoint: 0,
        buyerId: buyerId,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: productId,
        productName: '대시보드 테스트 상품',
        productImage: 'https://fake-s3-url.com/product.jpg',
        sizeId: sizeId,
        price: 100000,
        quantity: 2,
        storeId: storeId,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        price: 200000,
        status: 'CompletedPayment',
      },
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('판매자가 대시보드 조회', async () => {
    // 4. 판매자가 대시보드 조회
    const dashboardRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body).toHaveProperty('today');
    expect(dashboardRes.body).toHaveProperty('week');
    expect(dashboardRes.body).toHaveProperty('month');
    expect(dashboardRes.body).toHaveProperty('year');
    expect(dashboardRes.body).toHaveProperty('topSales');
    expect(dashboardRes.body).toHaveProperty('priceRange');

    // today 구조 검증
    expect(dashboardRes.body.today).toHaveProperty('current');
    expect(dashboardRes.body.today).toHaveProperty('previous');
    expect(dashboardRes.body.today).toHaveProperty('changeRate');
    expect(dashboardRes.body.today.current).toHaveProperty('totalOrders');
    expect(dashboardRes.body.today.current).toHaveProperty('totalSales');

    // topSales 구조 검증
    expect(Array.isArray(dashboardRes.body.topSales)).toBe(true);

    // priceRange 구조 검증
    expect(Array.isArray(dashboardRes.body.priceRange)).toBe(true);
  });

  it('구매자가 대시보드 조회 시도 시 403 에러', async () => {
    // 5. 구매자가 대시보드 조회 시도 (403 에러)
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('판매자만');
  });

  it('인증 없이 대시보드 조회 시도 시 401 에러', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(401);
  });

  it('대시보드 데이터에 year 통계가 올바르게 계산됨', async () => {
    const dashboardRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(dashboardRes.status).toBe(200);

    // year 데이터 검증
    const yearData = dashboardRes.body.year;
    expect(yearData).toBeDefined();
    expect(yearData.current).toHaveProperty('totalOrders');
    expect(yearData.current).toHaveProperty('totalSales');

    // 생성한 주문이 year 통계에 포함되어야 함
    expect(yearData.current.totalOrders).toBeGreaterThanOrEqual(1);
    expect(yearData.current.totalSales).toBeGreaterThanOrEqual(200000);
  });

  it('대시보드 priceRange가 올바르게 계산됨', async () => {
    const dashboardRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(dashboardRes.status).toBe(200);

    const priceRange = dashboardRes.body.priceRange;
    expect(Array.isArray(priceRange)).toBe(true);

    // priceRange 항목 검증
    priceRange.forEach((range: any) => {
      expect(range).toHaveProperty('priceRange');
      expect(range).toHaveProperty('totalSales');
      expect(range).toHaveProperty('percentage');
      expect(typeof range.percentage).toBe('number');
    });
  });

  it('대시보드 topSales가 올바르게 계산됨', async () => {
    const dashboardRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(dashboardRes.status).toBe(200);

    const topSales = dashboardRes.body.topSales;
    expect(Array.isArray(topSales)).toBe(true);

    // topSales 항목 검증
    topSales.forEach((item: any) => {
      expect(item).toHaveProperty('totalOrders');
      expect(item).toHaveProperty('product');
      expect(item.product).toHaveProperty('id');
      expect(item.product).toHaveProperty('name');
      expect(item.product).toHaveProperty('price');
    });
  });
});
