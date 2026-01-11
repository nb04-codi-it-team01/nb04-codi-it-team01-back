import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';
import { Notification } from '@prisma/client';

/**
 * [알림 시스템 통합 테스트 시나리오]
 * 1. [품절 알림] 구매자A가 주문하여 재고가 소진되면, 판매자A와 장바구니 유저(구매자B)에게만 알림이 가고 본인(구매자A)과 타인(판매자B)은 제외된다.
 * 2. [문의/답변 알림] 문의 등록 시 판매자에게, 답변 등록 시 구매자에게 각각 정의된 메시지 템플릿으로 알림이 생성된다.
 * 3. [보안: 타 판매자] 판매자B가 판매자A의 알림을 읽음 처리(check)하려고 시도할 경우 403(Forbidden)으로 차단한다.
 * 4. [보안: 구매자] 구매자A가 판매자A의 알림을 읽음 처리(check)하려고 시도할 경우 403(Forbidden)으로 차단한다.
 * 5. [정상 읽음] 판매자A가 본인의 알림을 읽음 처리하면 isChecked가 true로 정상 변경된다.
 * 6. [실시간 발송] SSE 연결 시 미전송 알림이 클라이언트로 전송되며, DB의 isSent 상태가 true로 동기화된다.
 */

describe('알림 시스템 종합 통합 테스트 (서비스 기반)', () => {
  let sellerAToken: string, sellerBToken: string;
  let buyerAToken: string, buyerBToken: string;
  let sellerAId: string;
  let productIdA: string, sizeId: number;
  let alarmIdForSellerA: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();

    const sA = await request(app).post('/api/users').send(testUsers.seller);
    sellerAId = sA.body.id;
    const sALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testUsers.seller.email, password: testUsers.seller.password });
    sellerAToken = sALogin.body.accessToken;

    await request(app)
      .post('/api/users')
      .send({ ...testUsers.seller, email: 'sellerB@test.com' });
    const sBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sellerB@test.com', password: testUsers.seller.password });
    sellerBToken = sBLogin.body.accessToken;

    await request(app).post('/api/users').send(testUsers.buyer);
    const bALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testUsers.buyer.email, password: testUsers.buyer.password });
    buyerAToken = bALogin.body.accessToken;

    await request(app).post('/api/users').send(testUsers.anotherBuyer);
    const bBLogin = await request(app).post('/api/auth/login').send({
      email: testUsers.anotherBuyer.email,
      password: testUsers.anotherBuyer.password,
    });
    buyerBToken = bBLogin.body.accessToken;

    const storeA = await prisma.store.create({
      data: {
        name: '테스트 스토어',
        address: '서울시 강남구',
        phoneNumber: '02-1234-5678',
        content: '테스트용 스토어입니다',
        userId: sellerAId,
      },
    });

    const size = await prisma.size.create({
      data: { en: 'L', ko: '라지' },
    });
    sizeId = size.id;

    const productA = await prisma.product.create({
      data: {
        name: 'A상품',
        price: 1000,
        categoryName: 'TOP',
        storeId: storeA.id,
        stocks: { create: { sizeId: sizeId, quantity: 1 } },
      },
    });
    productIdA = productA.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it('1. [품절 알림] 구매자 A가 주문하여 품절되면, 장바구니에 담아둔 구매자 B에게 알림이 간다', async () => {
    await request(app).post('/api/cart').set('Authorization', `Bearer ${buyerBToken}`).send();
    await request(app)
      .patch('/api/cart')
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({
        productId: productIdA,
        quantity: 1,
        sizes: [{ sizeId, quantity: 1 }],
      });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        name: '홍길동',
        phone: '123456-7890',
        address: '서울시 강남구',
        usePoint: 0,
        orderItems: [{ productId: productIdA, sizeId: sizeId, quantity: 1 }],
      });

    expect(orderRes.status).toBe(201);

    const sResA = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${sellerAToken}`);
    const soldOutAlarm = sResA.body.list.find((n: Notification) => n.content.includes('품절'));
    expect(soldOutAlarm).toBeDefined();
    alarmIdForSellerA = soldOutAlarm.id;

    const bResB = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerBToken}`);
    expect(bResB.body.list.some((n: Notification) => n.content.includes('품절'))).toBe(true);

    const bResA = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerAToken}`);
    const hasSoldOutForA = bResA.body.list.some((n: Notification) => n.content.includes('품절'));
    expect(hasSoldOutForA).toBe(false);

    const sResB = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${sellerBToken}`);
    const hasSoldOutForSellerB = sResB.body.list.some((n: Notification) =>
      n.content.includes('품절'),
    );
    expect(hasSoldOutForSellerB).toBe(false);
  });

  it('2. 타입별 알림 생성: 문의/답변 API 호출 시 알림이 정상 생성되어야 한다', async () => {
    const inquiryRes = await request(app)
      .post(`/api/products/${productIdA}/inquiries`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        title: '테스트 문의',
        content: '테스트 문의 내용입니다.',
        isSecret: false,
      });

    expect(inquiryRes.status).toBe(201);
    const inquiryId = inquiryRes.body.id;

    const sRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${sellerAToken}`);

    const expectedInquiryMsg = 'A상품 상품에 새로운 문의가 생겼습니다.';
    expect(sRes.body.list.some((n: Notification) => n.content === expectedInquiryMsg)).toBe(true);

    const replyRes = await request(app)
      .post(`/api/inquiries/${inquiryId}/replies`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ content: '테스트 문의 답변입니다.' });

    expect(replyRes.status).toBe(201);

    const bRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerAToken}`);

    const expectedReplyMsg = '문의하신 A상품 상품에 대한 답변이 등록되었습니다.';
    expect(bRes.body.list.some((n: Notification) => n.content === expectedReplyMsg)).toBe(true);
  });

  it('3. 보안: 판매자 B는 판매자 A의 알림을 읽음 처리할 수 없다 (403)', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${alarmIdForSellerA}/check`)
      .set('Authorization', `Bearer ${sellerBToken}`);

    expect(res.status).toBe(403);
  });

  it('4. 보안: 구매자 A는 판매자 A의 알림을 읽음 처리할 수 없다 (403)', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${alarmIdForSellerA}/check`)
      .set('Authorization', `Bearer ${buyerAToken}`);

    expect(res.status).toBe(403);
  });

  it('5. 정상 처리: 판매자 A가 자신의 알림을 읽음 처리하면 성공한다', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${alarmIdForSellerA}/check`)
      .set('Authorization', `Bearer ${sellerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isChecked).toBe(true);
  });

  it('6. SSE 통합 테스트: 문의 등록 시 생성된 알림이 SSE 연결을 통해 발송 처리되어야 한다', async () => {
    await request(app)
      .post(`/api/products/${productIdA}/inquiries`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({ title: 'SSE 테스트', content: '내용', isSecret: false });

    const unsentAlarm = await prisma.notification.findFirst({
      where: { userId: sellerAId, isSent: false },
    });
    expect(unsentAlarm).toBeDefined();

    try {
      await request(app)
        .get('/api/notifications/sse')
        .set('Authorization', `Bearer ${sellerAToken}`)
        .timeout(1000);
    } catch (err) {
      // 타임아웃 무시
    }

    const checkAlarm = await prisma.notification.findUnique({
      where: { id: unsentAlarm?.id },
    });

    expect(checkAlarm?.isSent).toBe(true);
  }, 15000);
});
