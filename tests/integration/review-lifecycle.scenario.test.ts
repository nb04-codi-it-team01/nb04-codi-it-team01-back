import request from 'supertest';
import { app } from '../../src/app';
import { clearDatabase, disconnectDatabase, seedTestDatabase } from '../helpers/test-db';
import { testUsers } from '../helpers/test-fixtures';
import prisma from '../../src/lib/prisma';

/**
 * 시나리오: 리뷰 생애주기(Lifecycle) 및 보안 검증
 * * [등장인물]
 * - 구매자A (주인공): 상품을 실제로 구매하고 리뷰를 관리하는 유저
 * - 구매자B (악역/제3자): 구매하지 않았거나 남의 리뷰를 건드리는 유저
 * - 판매자: 상품을 판매하는 스토어 주인
 * * * [진행 순서]
 * 1. [작성] 실구매자(A)가 상품에 리뷰를 남긴다. (성공)
 * 2. [유효성] 내용이 너무 짧으면(10자 미만) 작성이 거부된다. (400)
 * 3. [중복] 이미 리뷰를 쓴 주문 건으로 다시 작성을 시도하면 막힌다. (409)
 * 4. [권한] 구매하지 않은 사람(B)이 리뷰를 쓰려고 하면 차단된다. (403)
 * 5. [조회] 상품 상세 페이지에서 리뷰 목록이 정상적으로 조회된다.
 * 6. [수정] 작성자(A)가 마음이 바뀌어 리뷰 내용을 수정한다. (성공)
 * 7. [보안] 제3자(B)가 남의 리뷰를 수정하거나 삭제하려 하면 차단된다. (403)
 * 8. [삭제] 작성자(A)가 본인의 리뷰를 삭제한다. (성공)
 */
describe('리뷰 통합 시나리오 테스트', () => {
  let buyerAToken: string;
  let buyerBToken: string;

  let sellerId: string;
  let buyerAId: string;
  let productId: string;
  let orderItemId: string;
  let reviewId: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestDatabase();

    // 0. 기초 데이터(사이즈) 준비
    const testSize = await prisma.size.create({ data: { en: 'FREE', ko: 'FREE' } });

    // 1. 유저 생성 및 로그인
    // [판매자]
    const sellerRes = await request(app).post('/api/users').send(testUsers.seller);
    sellerId = sellerRes.body.id;

    // [구매자 A] (실구매자)
    const buyerARes = await request(app).post('/api/users').send(testUsers.buyer);
    buyerAId = buyerARes.body.id;
    const loginA = await request(app).post('/api/auth/login').send({
      email: testUsers.buyer.email,
      password: testUsers.buyer.password,
    });
    buyerAToken = loginA.body.accessToken;

    // [구매자 B] (비구매자/제3자)
    const buyerBData = { ...testUsers.buyer, email: 'buyerB@test.com', nickname: 'buyerB' };
    await request(app).post('/api/users').send(buyerBData);
    const loginB = await request(app).post('/api/auth/login').send({
      email: buyerBData.email,
      password: buyerBData.password,
    });
    buyerBToken = loginB.body.accessToken;

    // 2. 스토어 및 상품 생성
    const store = await prisma.store.create({
      data: {
        name: '리뷰 테스트 스토어',
        userId: sellerId,
        address: '서울',
        phoneNumber: '010-1111-2222',
        content: '설명',
      },
    });

    const product = await prisma.product.create({
      data: {
        name: '리뷰용 상품',
        price: 10000,
        content: '좋은 상품',
        categoryName: 'TOP',
        storeId: store.id,
        image: 'img.jpg',
      },
    });
    productId = product.id;

    // 3. 주문 내역(Order & OrderItem) 생성 - 구매자A가 구매함
    const order = await prisma.order.create({
      data: {
        buyerId: buyerAId,
        name: '구매자A',
        phoneNumber: '010-0000-0000',
        address: '집',
        subtotal: 10000,
        totalQuantity: 1,

        orderItems: {
          create: {
            productId: productId,
            storeId: store.id,
            quantity: 1,
            price: 10000,
            sizeId: testSize.id,
            productName: '리뷰용 상품',
            isReviewed: false,
          },
        },
      },
      include: { orderItems: true },
    });

    orderItemId = order.orderItems[0].id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  // =================================================================
  // SCENARIO START
  // =================================================================

  it('1. [작성] 실구매자(구매자A)는 구매한 상품에 대해 별점 5점 리뷰를 남길 수 있다.', async () => {
    const res = await request(app)
      .post(`/api/product/${productId}/reviews`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        orderItemId: orderItemId,
        rating: 5,
        content: '정말 만족스러운 상품입니다. 배송도 빠르네요!', // 10자 이상
      });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.user.name).toBe(testUsers.buyer.name); // 작성자 정보 포함 확인

    // 다음 스텝을 위해 리뷰 ID 저장
    reviewId = res.body.id;

    // DB 검증: 상품의 평점 통계가 업데이트 되었는지 확인
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.avgRating).toBe(5);
    expect(product?.reviewCount).toBe(1);
  });

  it('2. [유효성] 리뷰 내용이 10자 미만이면 작성이 거부된다. (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/product/${productId}/reviews`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        orderItemId: orderItemId,
        rating: 3,
        content: '짧아요', // 10자 미만
      });

    expect(res.status).toBe(400); // Zod validation error
  });

  it('3. [중복] 이미 리뷰를 작성한 주문 건에 대해 다시 작성을 시도하면 실패한다. (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/product/${productId}/reviews`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        orderItemId: orderItemId,
        rating: 4,
        content: '다시 쓰려고 합니다. 길게 씁니다.',
      });

    expect(res.status).toBe(409); // Service Logic
  });

  it('4. [권한] 구매하지 않은 유저(구매자B)가 리뷰 작성을 시도하면 차단된다. (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/product/${productId}/reviews`)
      .set('Authorization', `Bearer ${buyerBToken}`) // 구매내역 없는 유저
      .send({
        orderItemId: orderItemId, // 남의 주문 아이템 ID를 도용 시도
        rating: 1,
        content: '제가 산 건 아니지만 별로네요.',
      });

    expect(res.status).toBe(403);
  });

  it('5. [조회] 상품 상세 페이지에서 등록된 리뷰 목록을 조회할 수 있다.', async () => {
    const res = await request(app)
      .get(`/api/product/${productId}/reviews`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.items[0].content).toContain('만족스러운 상품');
  });

  it('6. [수정] 작성자(구매자A)는 본인의 리뷰 내용을 수정할 수 있다.', async () => {
    const res = await request(app)
      .patch(`/api/review/${reviewId}`)
      .set('Authorization', `Bearer ${buyerAToken}`)
      .send({
        rating: 4,
        content: '생각해보니 조금 아쉽네요. 그래도 좋아요.', // 수정 내용도 10자 이상
      });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4);
    expect(res.body.content).toContain('조금 아쉽네요');
  });

  it('7. [보안] 타인(구매자B)이 구매자A의 리뷰를 수정하거나 삭제하려 하면 차단된다. (403 Forbidden)', async () => {
    // 수정 시도
    const updateRes = await request(app)
      .patch(`/api/review/${reviewId}`)
      .set('Authorization', `Bearer ${buyerBToken}`)
      .send({ rating: 1, content: '해커의 해킹 시도입니다.' });

    expect(updateRes.status).toBe(403);

    // 삭제 시도
    const deleteRes = await request(app)
      .delete(`/api/review/${reviewId}`)
      .set('Authorization', `Bearer ${buyerBToken}`);

    expect(deleteRes.status).toBe(403);
  });

  it('8. [삭제] 작성자(구매자A)는 본인의 리뷰를 삭제할 수 있다.', async () => {
    const res = await request(app)
      .delete(`/api/review/${reviewId}`)
      .set('Authorization', `Bearer ${buyerAToken}`);

    expect(res.status).toBe(204); // No Content

    // DB 확인: 데이터가 사라졌는지 확인
    const deletedReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    expect(deletedReview).toBeNull();
  });
});
