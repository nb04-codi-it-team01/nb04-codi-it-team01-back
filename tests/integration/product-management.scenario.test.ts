/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';
import { InquiryStatus } from '@prisma/client';

/**
 * 시나리오: 상품 생애주기(Lifecycle), 권한 보안 및 데이터 정합성 검증
 * * [주요 검증 항목]
 * 1. CRUD: 상품의 등록, 조회, 수정, 삭제 기본 흐름
 * 2. 보안: 타인 상품에 대한 수정/삭제 시도 차단 (403 Forbidden)
 * 3. 유효성: 스키마 정의에 따른 잘못된 할인 기간 설정 차단 (400 Bad Request)
 * 4. 비즈니스 로직: 할인율 적용 가격, 리뷰 평점 평균, 문의/답변 매핑 로직의 정확성
 * * [진행 순서]
 * 1. [등록] 판매자A가 '테스트 티셔츠'를 등록한다.
 * 2. [조회] 등록된 상품이 상세 페이지와 목록(필터링 포함)에 정상 노출되는지 확인한다.
 * 3. [수정] 판매자A가 본인 상품의 가격 및 재고 정보를 수정한다.
 * 4. [보안] 판매자B(타인)가 판매자A의 상품 수정을 시도할 경우 차단한다.
 * 5. [보안] 판매자B(타인)가 판매자A의 상품 삭제를 시도할 경우 차단한다.
 * 6. [삭제] 판매자A가 상품을 삭제하고 DB에서 제거되었는지 확인한다.
 * 7. [할인] 할인율 및 기간 설정 시, 매퍼가 할인된 가격(discountPrice)을 정확히 계산하는지 확인한다.
 * 8. [예외] 할인 종료 시간이 시작 시간보다 빠른 부적절한 요청을 차단한다.
 * 9. [리뷰] 실제 주문 데이터를 기반으로 리뷰 작성 시, 평균 평점과 리뷰 수가 상세 조회에 반영되는지 확인한다.
 * 10. [문의-완료] 판매자가 답변을 등록한 문의가 상세 페이지에서 답변 객체와 함께 조회되는지 확인한다.
 * 11. [문의-대기] 답변이 없는 문의의 경우, 답변 필드가 undefined로 안전하게 처리되는지 확인한다.
 */
describe('상품 관리 및 보안 시나리오', () => {
  let sellerToken: string;
  let anotherSellerToken: string;

  let sellerId: string;
  let storeId: string;
  let productId: string;
  let sizeId: number;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();

    // 0. 기초 데이터(사이즈) 준비
    const size = await prisma.size.findFirst();
    if (!size) {
      const newSize = await prisma.size.create({ data: { en: 'FREE', ko: 'FREE' } });
      sizeId = newSize.id;
    } else {
      sizeId = size.id;
    }

    // 1. 판매자 A (주인공) 생성 & 로그인 & 스토어 개설
    const seller = await request(app).post('/api/users').send(testUsers.seller);
    sellerId = seller.body.id;

    const loginA = await request(app).post('/api/auth/login').send({
      email: testUsers.seller.email,
      password: testUsers.seller.password,
    });
    sellerToken = loginA.body.accessToken;

    const store = await prisma.store.create({
      data: {
        name: '판매자A의 스토어',
        userId: sellerId,
        address: '서울',
        phoneNumber: '010-1234-5678',
        content: '정직한 스토어',
      },
    });
    storeId = store.id;

    // 2. 판매자 B (악역) 생성 & 로그인 & 스토어 개설
    const sellerBData = { ...testUsers.seller, email: 'hacker@test.com', nickname: 'Hacker' };
    const sellerBUser = await request(app).post('/api/users').send(sellerBData);

    const loginB = await request(app).post('/api/auth/login').send({
      email: sellerBData.email,
      password: sellerBData.password,
    });
    anotherSellerToken = loginB.body.accessToken;

    await prisma.store.create({
      data: {
        name: '해커 스토어',
        userId: sellerBUser.body.id,
        address: '어둠의 경로',
        phoneNumber: '010-0000-0000',
        content: '해킹용',
      },
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  // =================================================================
  // SCENARIO START
  // =================================================================

  it('1. [등록] 판매자A가 상품을 등록한다.', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '테스트 티셔츠')
      .field('price', 15000)
      .field('content', '편안한 티셔츠입니다.')
      .field('categoryName', 'TOP')
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 10 }]))
      .attach('image', Buffer.from('fake-image-content'), 'test-image.png');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('테스트 티셔츠');

    // 다음 스텝을 위해 ID 저장
    productId = res.body.id;
  });

  it('2. [조회] 등록된 상품 정보가 조회되고, 카테고리 필터링도 동작한다.', async () => {
    const detailRes = await request(app).get(`/api/products/${productId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.name).toBe('테스트 티셔츠');
    expect(detailRes.body.storeName).toBe('판매자A의 스토어');

    await prisma.product.create({
      data: {
        name: '비교용 바지',
        price: 20000,
        content: '바지입니다.',
        categoryName: 'BOTTOM',
        storeId: storeId,
        image: 'pants.jpg',
      },
    });

    const listRes = await request(app).get('/api/products?categoryName=TOP');
    expect(listRes.status).toBe(200);

    const names = listRes.body.list.map((p: any) => p.name);
    expect(names).toContain('테스트 티셔츠');
    expect(names).not.toContain('비교용 바지');
  });

  it('3. [수정] 판매자A는 본인의 상품 정보를 수정할 수 있다.', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '수정된 티셔츠')
      .field('price', 18000) // 가격 인상
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 5 }]));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('수정된 티셔츠');
    expect(res.body.price).toBe(18000);
  });

  it('4. [보안] 판매자B(타인)가 상품 수정을 시도하면 차단된다.', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSellerToken}`) // 해커 토큰
      .field('name', '해킹된 이름')
      .field('price', 0)
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 0 }]));

    // Forbidden 에러 확인
    expect(res.status).toBe(403);
  });

  it('5. [보안] 판매자B(타인)가 상품 삭제를 시도하면 차단된다.', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${anotherSellerToken}`); // 해커 토큰

    expect(res.status).toBe(403);
  });

  it('6. [삭제] 판매자A는 본인의 상품을 정상적으로 삭제할 수 있다.', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(204);

    const deletedProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    expect(deletedProduct).toBeNull();
  });

  it('7. [할인] 할인율과 기간이 설정된 상품이 정상적으로 계산된다.', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1시간 전
    const endTime = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // 1시간 후

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '할인 티셔츠')
      .field('price', 10000)
      .field('discountRate', 20) // 20% 할인
      .field('discountStartTime', startTime)
      .field('discountEndTime', endTime)
      .field('categoryName', 'TOP')
      .field('content', '할인 상품 설명')
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 10 }]));

    expect(res.status).toBe(201);
    expect(res.body.discountPrice).toBe(8000); // 10000원 -> 8000원 확인
  });

  it('8. [스키마] 할인 종료 시간이 시작 시간보다 빠르면 400 에러가 난다.', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('name', '잘못된 할인')
      .field('price', 10000)
      .field('discountRate', 10)
      .field('discountStartTime', '2025-12-31T23:59:59Z')
      .field('discountEndTime', '2025-01-01T00:00:00Z') // 과거 시간
      .field('categoryName', 'TOP')
      .field('stocks', JSON.stringify([{ sizeId: sizeId, quantity: 10 }]));

    expect(res.status).toBe(400); // superRefine 통과 실패
  });

  it('9. [리뷰] 리뷰가 있는 상품 조회 시 평점이 정상 계산된다.', async () => {
    const newProduct = await prisma.product.create({
      data: {
        name: '평점 테스트 상품',
        price: 10000,
        content: '설명',
        categoryName: 'TOP',
        storeId: storeId,
        image: 'test.jpg',
      },
    });
    productId = newProduct.id;

    const order = await prisma.order.create({
      data: {
        name: '테스트',
        address: '서울',
        phoneNumber: '010-0000-0000',
        totalQuantity: 1,
        subtotal: 10000,
        usePoint: 0,
        buyer: { connect: { id: sellerId } },
      },
    });

    const orderItem = await prisma.orderItem.create({
      data: {
        quantity: 1,
        price: 10000,
        productName: '평점 테스트 상품',
        order: { connect: { id: order.id } },
        product: { connect: { id: productId } },
        size: { connect: { id: sizeId } },
      },
    });

    await prisma.review.create({
      data: {
        rating: 5,
        content: '최고예요!',
        user: { connect: { id: sellerId } },
        product: { connect: { id: productId } },
        orderItem: { connect: { id: orderItem.id } },
      },
    });

    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.reviewsRating).toBe(5.0);
    expect(res.body.reviewsCount).toBe(1);
  });

  it('10. [문의] 답변이 달린 문의가 포함된 상품 정보를 조회한다.', async () => {
    const inquiry = await prisma.inquiry.create({
      data: {
        title: '재입고 문의',
        content: '언제 되나요?',
        status: InquiryStatus.CompletedAnswer,
        isSecret: false,
        userId: sellerId,
        productId: productId,
      },
    });

    await prisma.inquiryReply.create({
      data: {
        content: '내일 됩니다.',
        inquiryId: inquiry.id,
        userId: sellerId,
      },
    });

    const res = await request(app).get(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.inquiries.length).toBeGreaterThan(0);
    expect(res.body.inquiries[0].reply).toBeDefined();
    expect(res.body.inquiries[0].reply.content).toBe('내일 됩니다.');
  });

  it('11. [문의/매퍼] 답변이 없는 문의도 목록에 정상 노출된다.', async () => {
    await prisma.inquiry.create({
      data: {
        title: '답변 대기 중인 문의',
        content: '언제 배송되나요?',
        status: InquiryStatus.WaitingAnswer,
        isSecret: false,
        userId: sellerId,
        productId: productId,
      },
    });

    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    const pendingInquiry = res.body.inquiries.find((i: any) => i.title === '답변 대기 중인 문의');
    expect(pendingInquiry.reply).toBeUndefined();
  });
});
